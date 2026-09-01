import { useCallback, useEffect, useRef, useState } from 'react';

import { getWebSocketUrl } from './videoConfig';
import { useAuthStore } from '../../store/authStore';

const SIGNALING_URL = getWebSocketUrl(); // Initial value
// Enhanced ICE servers with STUN and TURN for reliable NAT traversal
const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        // Free TURN servers from Open Relay (reliable for testing/development)
        {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'open',
            credential: 'open'
        },
        {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'open',
            credential: 'open'
        },
        {
            urls: 'turn:openrelay.metered.ca:443?transport=tcp',
            username: 'open',
            credential: 'open'
        }
    ],
    iceCandidatePoolSize: 10
};

interface SignalMessage {
    type: string;
    data: any;
    sender?: string;
    target?: string;
}

export interface StreamQualityInfo {
    width?: number;
    height?: number;
    frameRate?: number;
    facingMode?: string;
    stepIndex: number;
    isDowngraded: boolean;
    qualityLabel: '1080p' | '720p' | '480p' | 'low';
}

const VIDEO_FALLBACK_STEPS: { name: string; constraints: MediaTrackConstraints }[] = [
    // Step 0: 1080p (Full HD / 4K ideal)
    {
        name: '1080p Full HD',
        constraints: {
            width: { ideal: 1920, max: 3840 },
            height: { ideal: 1080, max: 2160 },
            facingMode: { ideal: 'environment' }
        }
    },
    // Step 1: 720p (HD)
    {
        name: '720p HD',
        constraints: {
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            facingMode: { ideal: 'environment' }
        }
    },
    // Step 2: 480p (SD)
    {
        name: '480p SD',
        constraints: {
            width: { ideal: 640, max: 1280 },
            height: { ideal: 480, max: 720 },
            facingMode: { ideal: 'environment' }
        }
    },
    // Step 3: Unconstrained resolution for environment camera
    {
        name: 'Environment Camera (Unconstrained)',
        constraints: {
            facingMode: { ideal: 'environment' }
        }
    },
    // Step 4: Any available video camera unconstrained
    {
        name: 'Any Camera (Unconstrained)',
        constraints: {}
    }
];

export const useWebRTC = (onMessage?: (msg: SignalMessage) => void) => {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [localStreamQuality, setLocalStreamQuality] = useState<StreamQualityInfo | null>(null);
    // Map<UserId, MediaStream>
    const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
    // Track connection state for each peer
    const [connectionStates, setConnectionStates] = useState<Map<string, RTCPeerConnectionState>>(new Map());

    const socket = useRef<WebSocket | null>(null);
    // Map<UserId, RTCPeerConnection>
    const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
    const messageQueue = useRef<SignalMessage[]>([]);

    // ICE candidates may arrive before remoteDescription is set. Buffer them per peer.
    const pendingIceCandidates = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

    // CHANGED: Use a ref for localStream to ensure callbacks (like createPeerConnection)
    // access the latest stream immediately without waiting for re-renders.
    const localStreamRef = useRef<MediaStream | null>(null);
    const localStreamQualityRef = useRef<StreamQualityInfo | null>(null);
    const onMessageRef = useRef(onMessage);

    // Set by cleanup() so the resulting socket close is not reported to the UI as an
    // unexpected drop (the UI uses 'socket-closed' to flush an in-progress recording).
    const intentionalCloseRef = useRef(false);

    useEffect(() => {
        onMessageRef.current = onMessage;
    }, [onMessage]);

    // We need to keep track of our own ID if possible, or just rely on socket
    // But usually we don't know our ID until we get a message, or we generate one.
    // The current backend uses SessionID which we don't know on client side easily without a handshake.
    // But for now, we just react to messages.

    const sendSignal = useCallback((type: string, data: any, target?: string) => {
        if (socket.current && socket.current.readyState === WebSocket.OPEN) {
            const msg: any = { type, data };
            if (target) msg.target = target;
            socket.current.send(JSON.stringify(msg));
        } else {
            messageQueue.current.push({ type, data, target });
        }
    }, []);

    const getAuthToken = useCallback(() => {
        // The merged app keeps the JWT in the Zustand authStore (persisted under
        // 'auth-storage'). Read it live so a fresh login is picked up. Guests have
        // no token — the backend's /signal accepts role:"guest" without one.
        const token = useAuthStore.getState().token;
        return token || null;
    }, []);

    const getJoinRole = useCallback(() => {
        if (typeof window === 'undefined') return 'organizer';
        const params = new URLSearchParams(window.location.search);
        const role = params.get('role');
        return role || 'organizer';
    }, []);

    const shouldInitiateOffers = useCallback(() => {
        const role = getJoinRole();
        return role !== 'guest';
    }, [getJoinRole]);

    const processMessageQueue = useCallback(() => {
        const queue = [...messageQueue.current];
        messageQueue.current = [];
        queue.forEach(msg => {
            sendSignal(msg.type, msg.data, msg.target);
        });
    }, [sendSignal]);

    // Helper to evaluate quality label from track settings
    const evaluateStreamQuality = useCallback((videoTrack: MediaStreamTrack, stepIndex: number): StreamQualityInfo => {
        const settings = typeof videoTrack.getSettings === 'function' ? videoTrack.getSettings() : {} as MediaTrackSettings;
        const w = settings.width || 0;
        const h = settings.height || 0;
        const maxDim = Math.max(w, h);

        let qualityLabel: '1080p' | '720p' | '480p' | 'low' = 'low';
        if (maxDim >= 1800) {
            qualityLabel = '1080p';
        } else if (maxDim >= 1200) {
            qualityLabel = '720p';
        } else if (maxDim >= 600) {
            qualityLabel = '480p';
        } else {
            qualityLabel = 'low';
        }

        const isDowngraded = stepIndex > 0 || qualityLabel !== '1080p';

        return {
            width: w,
            height: h,
            frameRate: settings.frameRate,
            facingMode: settings.facingMode,
            stepIndex,
            isDowngraded,
            qualityLabel
        };
    }, []);

    // 1. Acquire Media with Stepped Fallback
    const startLocalStream = useCallback(async (videoEnabled: boolean = true) => {
        if (localStreamRef.current) return localStreamRef.current;
        console.log(`[WebRTC] Acquiring local stream (videoEnabled=${videoEnabled})...`);

        if (typeof navigator === 'undefined' || !navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
            const err = new TypeError('navigator.mediaDevices.getUserMedia is not available. Please ensure the page is served over HTTPS.');
            console.error('[WebRTC] MediaDevices API unavailable:', err);
            throw err;
        }

        if (!videoEnabled) {
            try {
                const audioOnlyStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                setLocalStream(audioOnlyStream);
                localStreamRef.current = audioOnlyStream;
                return audioOnlyStream;
            } catch (err: any) {
                console.error('[WebRTC] Error acquiring audio-only stream:', { name: err?.name, message: err?.message }, err);
                throw err;
            }
        }

        let acquiredStream: MediaStream | null = null;
        let successfulStep = -1;
        let lastError: any = null;

        // Progressively step down resolution / constraints until camera opens
        for (let i = 0; i < VIDEO_FALLBACK_STEPS.length; i++) {
            const step = VIDEO_FALLBACK_STEPS[i];
            console.log(`[WebRTC] Attempting camera acquisition (Step ${i}: ${step.name})...`);

            try {
                acquiredStream = await navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: step.constraints
                });
                successfulStep = i;
                console.log(`[WebRTC] Camera successfully opened at Step ${i} (${step.name})`);
                break;
            } catch (stepErr: any) {
                lastError = stepErr;
                console.warn(`[WebRTC] Camera acquisition failed at Step ${i} (${step.name}): [${stepErr?.name}] ${stepErr?.message}`, {
                    stepIndex: i,
                    errorName: stepErr?.name,
                    errorMessage: stepErr?.message,
                    constraint: stepErr?.constraint
                });
            }
        }

        // If all audio+video steps failed, try once without audio constraint in case audio device blocked it
        if (!acquiredStream) {
            console.warn('[WebRTC] All standard audio+video steps failed. Trying video-only fallback...');
            for (let i = 0; i < VIDEO_FALLBACK_STEPS.length; i++) {
                const step = VIDEO_FALLBACK_STEPS[i];
                try {
                    acquiredStream = await navigator.mediaDevices.getUserMedia({
                        audio: false,
                        video: step.constraints
                    });
                    successfulStep = i;
                    console.log(`[WebRTC] Video-only camera opened at Step ${i} (${step.name})`);
                    break;
                } catch (vErr: any) {
                    lastError = vErr;
                }
            }
        }

        if (!acquiredStream) {
            console.error('[WebRTC] All camera acquisition fallback steps failed. Final error:', {
                name: lastError?.name,
                message: lastError?.message,
                constraint: lastError?.constraint
            }, lastError);
            throw lastError || new Error('Could not start video source after all fallback steps');
        }

        setLocalStream(acquiredStream);
        localStreamRef.current = acquiredStream;

        const videoTrack = acquiredStream.getVideoTracks()[0];
        if (videoTrack) {
            const initialQuality = evaluateStreamQuality(videoTrack, successfulStep);
            console.log('[WebRTC] Initial stream quality:', initialQuality);
            setLocalStreamQuality(initialQuality);
            localStreamQualityRef.current = initialQuality;

            // If a lower step was used (e.g. 720p, 480p, or unconstrained), try non-blockingly
            // to upgrade resolution via applyConstraints on the active track.
            if (successfulStep > 0) {
                setTimeout(async () => {
                    if (!videoTrack || videoTrack.readyState !== 'live') return;
                    try {
                        console.log('[WebRTC] Attempting post-start resolution upgrade to 1080p via applyConstraints...');
                        await videoTrack.applyConstraints({
                            width: { ideal: 1920, max: 3840 },
                            height: { ideal: 1080, max: 2160 }
                        });
                        const upgradedQuality = evaluateStreamQuality(videoTrack, 0);
                        console.log('[WebRTC] Post-start resolution upgrade successful:', upgradedQuality);
                        setLocalStreamQuality(upgradedQuality);
                        localStreamQualityRef.current = upgradedQuality;
                    } catch (upgradeErr: any) {
                        console.log(`[WebRTC] Post-start resolution upgrade not supported on device (${upgradeErr?.name}): continuing at Step ${successfulStep} resolution.`);
                    }
                }, 800);
            }
        }

        return acquiredStream;
    }, [evaluateStreamQuality]);

    // 2. Create PC for a specific user
    const createPeerConnection = useCallback((userId: string) => {
        if (peerConnections.current.has(userId)) {
            console.warn(`PC for ${userId} already exists.`);
            return peerConnections.current.get(userId);
        }

        console.log(`Creating PeerConnection for ${userId}`);
        const pc = new RTCPeerConnection(ICE_SERVERS);

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                sendSignal('candidate', event.candidate, userId);
            }
        };

        const drainPendingIce = async () => {
            const pending = pendingIceCandidates.current.get(userId);
            if (!pending || pending.length === 0) return;
            if (!pc.remoteDescription) return;

            pendingIceCandidates.current.delete(userId);
            for (const c of pending) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(c));
                } catch (err) {
                    console.error(`Error adding buffered ICE candidate for ${userId}:`, err);
                }
            }
        };

        pc.ontrack = (event) => {
            console.log(`Received remote track from ${userId}`, event.streams[0]);
            if (event.streams && event.streams[0]) {
                setRemoteStreams(prev => {
                    const newMap = new Map(prev);
                    newMap.set(userId, event.streams[0]);
                    return newMap;
                });
            }
        };

        pc.onconnectionstatechange = () => {
            console.log(`PC ${userId} state: ${pc.connectionState}`);
            setConnectionStates(prev => {
                const newMap = new Map(prev);
                newMap.set(userId, pc.connectionState);
                return newMap;
            });
            if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
                // Cleanup
                setRemoteStreams(prev => {
                    const newMap = new Map(prev);
                    newMap.delete(userId);
                    return newMap;
                });
                setConnectionStates(prev => {
                    const newMap = new Map(prev);
                    newMap.delete(userId);
                    return newMap;
                });
                peerConnections.current.delete(userId);
            }
        };

        // Handle ICE connection state for better debugging
        pc.oniceconnectionstatechange = () => {
            console.log(`PC ${userId} ICE state: ${pc.iceConnectionState}`);
            // If remote description got set late, try draining candidates.
            if (pc.remoteDescription) {
                drainPendingIce();
            }
        };

        // Add local tracks
        // CHANGED: Use ref to get the stream reliably
        if (localStreamRef.current) {
            const videoTracks = localStreamRef.current.getVideoTracks();
            const audioTracks = localStreamRef.current.getAudioTracks();

            audioTracks.forEach(track => {
                pc.addTrack(track, localStreamRef.current!);
            });

            videoTracks.forEach(track => {
                pc.addTrack(track, localStreamRef.current!);
            });

            // If we have no video tracks (e.g. Host), add a recvonly transceiver
            // so the remote side knows to send video.
            if (videoTracks.length === 0) {
                console.log('No local video track. Adding recvonly video transceiver.');
                pc.addTransceiver('video', { direction: 'recvonly' });
            }
        } else {
            console.warn("No local stream found when creating PC!");
        }

        peerConnections.current.set(userId, pc);
        return pc;
    }, [sendSignal]);

    // Helper: Strip the urn:3gpp:video-orientation RTP header extension from SDP.
    // When this extension is absent, iOS Safari is forced to physically rotate the
    // pixel buffer *before* encoding instead of relying on lightweight CVO metadata.
    // This means the transmitted stream is a true portrait buffer — drawImage() on
    // a canvas then captures it correctly without any aspect-ratio distortion.
    // Without this, iOS sends a raw landscape frame + a CVO rotation tag; the browser
    // GPU applies the tag visually, but canvas drawImage() ignores it entirely,
    // producing the severe stretching/squashing seen in screenshots.
    const stripCvoExtension = (sdp: string): string => {
        // Remove the extmap line that declares the CVO extension
        // Example: a=extmap:3 urn:3gpp:video-orientation
        const stripped = sdp
            .split('\n')
            .filter(line => !line.includes('urn:3gpp:video-orientation'))
            .join('\n');
        return stripped;
    };

    // 3. Initiate Call to a specific User (Offer)
    const callUser = useCallback(async (userId: string) => {
        const pc = createPeerConnection(userId);
        if (!pc) return;

        try {
            const offer = await pc.createOffer();

            // Helper for SDP
            const setMediaBitrate = (sdp: string, media: string, bitrate: number) => {
                const lines = sdp.split('\n');
                let line = -1;
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].indexOf('m=' + media) === 0) {
                        line = i;
                        break;
                    }
                }
                if (line === -1) {
                    return sdp;
                }
                line++;
                while (lines[line].indexOf('i=') === 0 || lines[line].indexOf('c=') === 0) {
                    line++;
                }
                if (lines[line].indexOf('b=AS') === 0) {
                    lines[line] = 'b=AS:' + bitrate;
                    return lines.join('\n');
                }
                lines.splice(line, 0, 'b=AS:' + bitrate);
                return lines.join('\n');
            };

            // Mangle SDP BEFORE setLocalDescription:
            // 1. Set bitrate limit
            // 2. Strip CVO extension so iOS is forced to pre-rotate the pixel buffer,
            //    ensuring canvas drawImage() captures a correctly-oriented frame.
            if (offer.sdp) {
                offer.sdp = setMediaBitrate(offer.sdp, 'video', 5000); // 5000 kbps = 5 Mbps
                offer.sdp = stripCvoExtension(offer.sdp);
            }

            // Only call setLocalDescription ONCE, with the (possibly mangled) offer
            await pc.setLocalDescription(offer);
            console.log(`Sending offer to ${userId}`);
            sendSignal('offer', offer, userId);
        } catch (err) {
            console.error(`Error processing offer for ${userId}`, err);
        }
    }, [createPeerConnection, sendSignal]);

    const handleOffer = useCallback(async (offer: RTCSessionDescriptionInit, senderId: string) => {
        console.log(`Handling offer from ${senderId}`);
        const pc = createPeerConnection(senderId);
        if (!pc) return;

        // ── Glare resolution (RFC 8829 §5.2) ──────────────────────────────────
        // Glare = both sides sent an offer at the same time.
        // Strategy: the ORGANIZER (non-guest) always wins — it keeps its own offer
        // and the GUEST rolls back and accepts the organizer's offer instead.
        //
        // shouldInitiateOffers() returns true for the organizer.
        // • Organizer receives guest's offer while in have-local-offer → drop guest offer,
        //   the guest will roll back and accept organizer's offer when it arrives.
        // • Guest receives organizer's offer while in have-local-offer → rollback our
        //   offer, accept organizer's offer, send answer.  This is the fix for the
        //   "sometimes stuck on loader" bug seen in the console logs.
        if (pc.signalingState === 'have-local-offer') {
            if (shouldInitiateOffers()) {
                // We are the organizer — we keep our offer. The guest will handle rollback.
                console.warn(`[Glare] Organizer dropping offer from ${senderId} — organizer keeps its own offer.`);
                return;
            } else {
                // We are the guest — rollback our offer and accept the organizer's.
                console.warn(`[Glare] Guest rolling back local offer to accept organizer's offer from ${senderId}.`);
                try {
                    await pc.setLocalDescription({ type: 'rollback' });
                } catch (rollbackErr) {
                    console.error(`[Glare] Rollback failed for ${senderId}:`, rollbackErr);
                    return;
                }
            }
        }

        try {
            await pc.setRemoteDescription(new RTCSessionDescription(offer));

            // Drain any ICE candidates received before remoteDescription was set
            const pending = pendingIceCandidates.current.get(senderId);
            if (pending && pending.length > 0) {
                pendingIceCandidates.current.delete(senderId);
                for (const c of pending) {
                    try {
                        await pc.addIceCandidate(new RTCIceCandidate(c));
                    } catch (err) {
                        console.error(`Error adding buffered ICE candidate from ${senderId}:`, err);
                    }
                }
            }

            const answer = await pc.createAnswer();

            // SDP bitrate helper
            const setMediaBitrate = (sdp: string, media: string, bitrate: number) => {
                const lines = sdp.split('\n');
                let line = -1;
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].indexOf('m=' + media) === 0) { line = i; break; }
                }
                if (line === -1) return sdp;
                line++;
                while (lines[line].indexOf('i=') === 0 || lines[line].indexOf('c=') === 0) line++;
                if (lines[line].indexOf('b=AS') === 0) {
                    lines[line] = 'b=AS:' + bitrate;
                    return lines.join('\n');
                }
                lines.splice(line, 0, 'b=AS:' + bitrate);
                return lines.join('\n');
            };

            if (answer.sdp) {
                answer.sdp = setMediaBitrate(answer.sdp, 'video', 5000);
                answer.sdp = stripCvoExtension(answer.sdp);
            }

            await pc.setLocalDescription(answer);
            sendSignal('answer', answer, senderId);
        } catch (err) {
            console.error(`Error handling offer from ${senderId}`, err);
        }
    }, [createPeerConnection, sendSignal, shouldInitiateOffers]);

    const handleAnswer = useCallback(async (answer: RTCSessionDescriptionInit, senderId: string) => {
        console.log(`Handling answer from ${senderId}`);
        const pc = peerConnections.current.get(senderId);
        if (pc) {
            // Fix: Check if connection is already stable to avoid InvalidStateError
            if (pc.signalingState === 'stable') {
                console.warn(`Connection with ${senderId} is already stable. Ignoring answer.`);
                return;
            }
            try {
                await pc.setRemoteDescription(new RTCSessionDescription(answer));

                // Drain any ICE candidates received before remoteDescription was set
                const pending = pendingIceCandidates.current.get(senderId);
                if (pending && pending.length > 0) {
                    pendingIceCandidates.current.delete(senderId);
                    for (const c of pending) {
                        try {
                            await pc.addIceCandidate(new RTCIceCandidate(c));
                        } catch (err) {
                            console.error(`Error adding buffered ICE candidate from ${senderId}:`, err);
                        }
                    }
                }
            } catch (err) {
                console.error(`Error setting remote description for answer from ${senderId}:`, err);
            }
        }
    }, []);

    const handleCandidate = useCallback(async (candidate: RTCIceCandidateInit, senderId: string) => {
        console.log(`Handling candidate from ${senderId}`);
        const pc = peerConnections.current.get(senderId);

        // If no PC exists yet (offer hasn't been received/processed yet), buffer the
        // candidate. This happens when the remote side sends ICE candidates faster than
        // the signaling round-trip for the offer/answer exchange completes.
        if (!pc) {
            console.warn(`[ICE] No PC for ${senderId} yet — buffering candidate.`);
            const pending = pendingIceCandidates.current.get(senderId) || [];
            pending.push(candidate);
            pendingIceCandidates.current.set(senderId, pending);
            return;
        }

        try {
            if (!pc.remoteDescription) {
                // PC exists but remote description not set yet — buffer.
                const pending = pendingIceCandidates.current.get(senderId) || [];
                pending.push(candidate);
                pendingIceCandidates.current.set(senderId, pending);
                return;
            }

            await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
            console.error(`Error adding ICE candidate from ${senderId}:`, err);
        }
    }, []);

    const handleUserJoined = useCallback(async (newUserId: string) => {
        console.log(`User joined: ${newUserId}. Initiating offer to them...`);

        // To avoid offer glare, only the organizer (non-guest) should initiate offers.
        if (!shouldInitiateOffers()) {
            console.log(`User joined: ${newUserId}. Guest mode: not initiating offer (waiting for organizer).`);
            return;
        }

        // If this is a re-join, ensure any previous PC/stream for that userId is cleared.
        const oldPc = peerConnections.current.get(newUserId);
        if (oldPc) {
            try { oldPc.close(); } catch { /* ignore */ }
            peerConnections.current.delete(newUserId);
        }
        // Also clear any stale buffered ICE candidates from a previous session
        pendingIceCandidates.current.delete(newUserId);

        setRemoteStreams(prev => {
            const newMap = new Map(prev);
            newMap.delete(newUserId);
            return newMap;
        });
        setConnectionStates(prev => {
            const newMap = new Map(prev);
            newMap.delete(newUserId);
            return newMap;
        });

        // Organizer sends the offer; guest waits and answers.
        await callUser(newUserId);
    }, [callUser, shouldInitiateOffers]);

    const handleUserLeft = useCallback((userId: string) => {
        console.log(`User left: ${userId}`);
        const pc = peerConnections.current.get(userId);
        if (pc) {
            pc.close();
            peerConnections.current.delete(userId);
        }
        pendingIceCandidates.current.delete(userId);
        setRemoteStreams(prev => {
            const newMap = new Map(prev);
            newMap.delete(userId);
            return newMap;
        });
        setConnectionStates(prev => {
            const newMap = new Map(prev);
            newMap.delete(userId);
            return newMap;
        });
    }, []);

    const handleMessage = useCallback(async (message: SignalMessage) => {
        try {
            const { type, data, sender } = message;
            // 'user-joined': data is the userId
            // 'existing-users': data is array of existing userIds
            // others: sender is the userId who sent it (injected by backend)

            switch (type) {
                case 'error':
                    // Backend sends {type:'error', data:{code,message}}
                    if (onMessageRef.current) onMessageRef.current(message);
                    break;
                case 'user-joined':
                    // data is the new user's ID
                    if (data) {
                        await handleUserJoined(data);
                        // Pass validation to onMessage so UI can sync state
                        if (onMessageRef.current) onMessageRef.current(message);
                    }
                    break;
                case 'existing-users':
                    // data is array of existing user IDs in the room.
                    // ONLY the organizer (non-guest) should send offers.
                    // Guests wait — the organizer will send them an offer once it
                    // receives the 'user-joined' event triggered by the guest joining.
                    // If both sides call callUser() simultaneously we get offer-glare
                    // and the connection never establishes (the whole "sometimes works,
                    // sometimes stuck on loader" bug).
                    if (Array.isArray(data) && data.length > 0) {
                        console.log('Found existing users in room:', data);
                        if (shouldInitiateOffers()) {
                            // Organizer joined a room that already has a guest (e.g. rejoin scenario)
                            for (const existingUserId of data) {
                                console.log('Organizer: initiating call to existing user:', existingUserId);
                                await callUser(existingUserId);
                            }
                        } else {
                            // Guest: do NOT send offer. Just log and wait for organizer's offer.
                            console.log('Guest: existing users present, waiting for organizer offer:', data);
                        }
                    }
                    break;
                case 'user-left':
                    if (data) {
                        handleUserLeft(data);
                        // Also surface it to the UI: the host needs it to stop and upload
                        // the recording when the guest hangs up or drops.
                        if (onMessageRef.current) onMessageRef.current(message);
                    }
                    break;
                case 'offer':
                    if (sender) await handleOffer(data, sender);
                    break;
                case 'answer':
                    if (sender) await handleAnswer(data, sender);
                    break;
                case 'candidate':
                    if (sender) await handleCandidate(data, sender);
                    break;
                default:
                    if (onMessageRef.current) {
                        onMessageRef.current(message);
                    }
                    break;
            }
        } catch (e) {
            console.error('Error handling signaling message:', message, e);
        }
    }, [handleUserJoined, handleUserLeft, handleOffer, handleAnswer, handleCandidate, callUser]);

    // Ref for message handler
    const handleMessageRef = useRef(handleMessage);
    useEffect(() => {
        handleMessageRef.current = handleMessage;
    }, [handleMessage]);

    const init = useCallback((roomId: string) => {
        // Cleanup any existing socket first
        if (socket.current) {
            socket.current.close();
            socket.current = null;
        }

        console.log(`Initializing WebSocket connection to ${SIGNALING_URL} for room ${roomId}`);
        intentionalCloseRef.current = false;
        socket.current = new WebSocket(SIGNALING_URL);

        socket.current.onopen = () => {
            console.log('WebSocket Connected successfully');
            const token = getAuthToken();
            const role = getJoinRole();
            // Join payload: backend expects {type:'join', data:<roomId>, token:<bearer>}
            // token can be either raw jwt or 'Bearer <jwt>'
            if (token) {
                socket.current?.send(JSON.stringify({ type: 'join', data: roomId, token, role }));
            } else {
                socket.current?.send(JSON.stringify({ type: 'join', data: roomId, role }));
            }
            processMessageQueue();
        };

        socket.current.onmessage = async (event) => {
            try {
                const message: SignalMessage = JSON.parse(event.data);
                console.log('WebSocket message received:', message.type, message);
                await handleMessageRef.current(message);
            } catch (error) {
                console.error("Failed to process websocket message", error);
            }
        };

        socket.current.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        const thisSocket = socket.current;
        socket.current.onclose = (event) => {
            console.log('WebSocket closed:', event.code, event.reason);
            // Don't auto-retry - let the UI handle reconnection if needed.
            // Report unexpected drops so the UI can flush an in-progress recording.
            // Skip when we closed it ourselves (cleanup) or when this is a stale socket
            // replaced by a newer init().
            if (intentionalCloseRef.current || socket.current !== thisSocket) return;
            if (onMessageRef.current) {
                onMessageRef.current({
                    type: 'socket-closed',
                    data: { code: event.code, reason: event.reason }
                });
            }
        };
    }, [processMessageQueue, sendSignal, getAuthToken, getJoinRole]);

    const cleanup = useCallback(() => {
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            setLocalStream(null);
            localStreamRef.current = null;
        }
        setRemoteStreams(new Map());
        setConnectionStates(new Map());
        peerConnections.current.forEach(pc => pc.close());
        peerConnections.current.clear();
        pendingIceCandidates.current.clear();

        if (socket.current) {
            intentionalCloseRef.current = true;
            socket.current.close();
            socket.current = null;
        }
        messageQueue.current = [];
    }, []);

    // Toggles
    const toggleAudio = useCallback((enabled: boolean) => {
        if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach(track => track.enabled = enabled);
        }
    }, []);

    const toggleVideo = useCallback((enabled: boolean) => {
        if (localStreamRef.current) {
            localStreamRef.current.getVideoTracks().forEach(track => track.enabled = enabled);
        }
    }, []);

    // Mutex ref: prevents concurrent switchCamera calls from racing each other.
    // On iPhone, rapid taps launch parallel getUserMedia calls that corrupt stream state.
    const isSwitchingCameraRef = useRef(false);

    // Tracks the current facing mode explicitly — iOS Safari returns blank deviceId
    // from enumerateDevices() until each camera has been used, making deviceId-based
    // toggling always select the same camera. facingMode toggling is the correct approach.
    const currentFacingModeRef = useRef<'user' | 'environment'>('environment');

    const switchCamera = useCallback(async (desiredFacingMode?: 'user' | 'environment'): Promise<boolean> => {
        // Concurrency guard: if a switch is already running, ignore the duplicate.
        if (isSwitchingCameraRef.current) {
            console.warn('[Camera] Switch already in progress — ignoring duplicate call.');
            return false;
        }
        if (!localStreamRef.current) return false;
        const videoTracks = localStreamRef.current.getVideoTracks();
        if (videoTracks.length === 0) return false;

        isSwitchingCameraRef.current = true;
        try {
            const currentTrack = videoTracks[0];
            const nextFacingMode: 'user' | 'environment' = desiredFacingMode
                ? desiredFacingMode
                : (currentFacingModeRef.current === 'environment' ? 'user' : 'environment');

            if (nextFacingMode === currentFacingModeRef.current) {
                console.log(`[Camera] Requested facingMode already active: ${nextFacingMode}`);
                return true;
            }

            console.log(`[Camera] Switching ${currentFacingModeRef.current} → ${nextFacingMode}`);

            // Strategy A: applyConstraints — works on some Android browsers without
            // needing a new stream. Try exact first, then ideal.
            let usedApplyConstraints = false;
            try {
                await currentTrack.applyConstraints({ facingMode: { exact: nextFacingMode } });
                usedApplyConstraints = true;
                console.log('[Camera] applyConstraints (exact) succeeded.');
            } catch {
                try {
                    await currentTrack.applyConstraints({ facingMode: { ideal: nextFacingMode } });
                    usedApplyConstraints = true;
                    console.log('[Camera] applyConstraints (ideal) succeeded.');
                } catch {
                    console.log('[Camera] applyConstraints not supported — using getUserMedia fallback.');
                }
            }

            if (!usedApplyConstraints) {
                // Strategy B: open new stream BEFORE stopping the old track.
                // Stopping first marks the sender track as ended; iOS then refuses
                // replaceTrack() on an ended sender.
                // Try stepped fallback for switch constraints
                const switchSteps: MediaTrackConstraints[] = [
                    { facingMode: { exact: nextFacingMode }, width: { ideal: 1920 }, height: { ideal: 1080 } },
                    { facingMode: { ideal: nextFacingMode }, width: { ideal: 1920 }, height: { ideal: 1080 } },
                    { facingMode: { ideal: nextFacingMode }, width: { ideal: 1280 }, height: { ideal: 720 } },
                    { facingMode: { ideal: nextFacingMode } }
                ];

                let newStream: MediaStream | null = null;
                let lastSwitchError: any = null;

                for (let s = 0; s < switchSteps.length; s++) {
                    try {
                        newStream = await navigator.mediaDevices.getUserMedia({
                            video: switchSteps[s],
                            audio: false
                        });
                        if (newStream) {
                            console.log(`[Camera] switchCamera getUserMedia succeeded at step ${s}`);
                            break;
                        }
                    } catch (swErr: any) {
                        lastSwitchError = swErr;
                        console.warn(`[Camera] switchCamera getUserMedia step ${s} failed:`, swErr?.name, swErr?.message);
                    }
                }

                if (!newStream) {
                    throw lastSwitchError || new Error('Failed to acquire stream during switchCamera');
                }

                const newVideoTrack = newStream.getVideoTracks()[0];

                // Replace track in all peer connections FIRST
                for (const pc of peerConnections.current.values()) {
                    const videoSender = pc.getSenders().find(s => s.track?.kind === 'video');
                    if (videoSender) {
                        try { await videoSender.replaceTrack(newVideoTrack); }
                        catch (err) { console.error('[Camera] replaceTrack failed:', err); }
                    }
                }

                // Now stop the old track — after all PCs have the new one
                currentTrack.stop();

                const audioTracks = localStreamRef.current.getAudioTracks();
                const newLocalStream = new MediaStream([...audioTracks, newVideoTrack]);
                setLocalStream(newLocalStream);
                localStreamRef.current = newLocalStream;

                const newQuality = evaluateStreamQuality(newVideoTrack, 0);
                setLocalStreamQuality(newQuality);
                localStreamQualityRef.current = newQuality;
            }

            currentFacingModeRef.current = nextFacingMode;
            console.log(`[Camera] Switch complete. Now facing: ${nextFacingMode}`);
            return true;

        } catch (error) {
            console.error('[Camera] Error switching camera:', error);
            return false;
        } finally {
            isSwitchingCameraRef.current = false;
        }
    }, [evaluateStreamQuality]);

    return {
        localStream,
        localStreamQuality,
        remoteStreams,
        connectionStates,
        startLocalStream,
        init,
        cleanup,
        toggleAudio,
        toggleVideo,
        switchCamera,
        sendMessage: sendSignal
    };
};