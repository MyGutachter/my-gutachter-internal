package com.mygutachter.controller;

import java.util.Map;

import org.bson.Document;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mygutachter.dto.UvvInspectionResultRequest;
import com.mygutachter.model.Order;
import com.mygutachter.service.OrderService;

/**
 * Inbound order import (Decision Q5 — OMT pushes; the app never pulls).
 *
 * <p>{@code POST /api/orders/import} is authenticated by <b>API key</b> (header
 * {@code X-API-KEY}) via {@code ApiKeyAuthenticationFilter}, so OMT can call it as a system
 * rather than as a logged-in user. The endpoint itself falls under the security chain's
 * {@code anyRequest().authenticated()} rule — the API-key filter is what lets OMT reach it.
 */
@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping("/import")
    public ResponseEntity<?> importOrder(@RequestBody Order order) {
        try {
            Document saved = orderService.importOrder(order);
            return ResponseEntity.ok(VideoOrderController.toVideoOrderDto(saved));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * UVV Digital (Decision Q9). {@code id} is the order's {@code caseNumber}. Records the
     * inspection result and reports it to OMT ({@code CompleteUvvInspection}). Authenticated
     * via the normal JWT chain ({@code /api/orders/**} → {@code anyRequest().authenticated()}).
     */
    @PatchMapping("/{id}/uvv")
    public ResponseEntity<?> completeUvvInspection(@PathVariable String id,
            @RequestBody UvvInspectionResultRequest request) {
        try {
            orderService.saveUvvResult(id, request);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /** Fetch the generated UVV certificate PDF (only when the result is PASSED). */
    @GetMapping("/{id}/uvv-certificate")
    public ResponseEntity<byte[]> getUvvCertificate(@PathVariable String id) {
        return orderService.getUvvCertificate(id);
    }
}
