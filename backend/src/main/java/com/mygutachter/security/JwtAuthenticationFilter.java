package com.mygutachter.security;

import com.mygutachter.service.JwtService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Validates the {@code Authorization: Bearer <jwt>} header and, on success, populates:
 * <ul>
 *   <li>the request attributes {@code userRole}, {@code expertName}, {@code userEmail}
 *       — exactly as the old {@code AuthInterceptor} did, so all existing controllers keep working;</li>
 *   <li>the Spring Security {@link SecurityContextHolder} with a {@code ROLE_<role>} authority,
 *       so the filter chain's {@code .authenticated()} rules pass.</li>
 * </ul>
 *
 * <p>This filter never rejects a request itself; unauthenticated requests simply reach the
 * authorization layer with no authentication and are handled there (401/permitAll).
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

    public JwtAuthenticationFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")
                && SecurityContextHolder.getContext().getAuthentication() == null) {
            String token = authHeader.substring(7);
            // 2FA temp tokens are only valid at /api/auth/2fa/login-verify; never let one
            // authenticate a normal request (it carries no role/username).
            if (Boolean.TRUE.equals(jwtService.validateToken(token)) && !jwtService.isTempToken(token)) {
                String email = jwtService.extractEmail(token);
                String username = jwtService.extractUsername(token);
                String role = jwtService.extractRole(token);

                // Preserve the contract the controllers rely on.
                request.setAttribute("userEmail", email);
                request.setAttribute("expertName", username);
                request.setAttribute("userRole", role);

                var authority = new SimpleGrantedAuthority("ROLE_" + (role == null ? "USER" : role));
                var authentication = new UsernamePasswordAuthenticationToken(
                        email, null, List.of(authority));
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        }

        filterChain.doFilter(request, response);
    }
}
