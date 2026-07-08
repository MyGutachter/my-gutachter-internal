package com.mygutachter.controller;

import com.mygutachter.model.DepreciationCalculateRequest;
import com.mygutachter.model.DepreciationCalculateResponse;
import com.mygutachter.service.DepreciationCalculationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/depreciation")
public class DepreciationController {

    private final DepreciationCalculationService calculationService;

    @Autowired
    public DepreciationController(DepreciationCalculationService calculationService) {
        this.calculationService = calculationService;
    }

    @PostMapping("/calculate")
    public ResponseEntity<DepreciationCalculateResponse> calculate(@RequestBody DepreciationCalculateRequest request) {
        // Validation
        if (request == null) {
            return ResponseEntity.badRequest().build();
        }
        if (request.getMileage() != null && request.getMileage() < 0) {
            return ResponseEntity.badRequest().build();
        }

        long startTime = System.currentTimeMillis();
        
        DepreciationCalculateResponse response = calculationService.calculateDepreciation(request);
        
        long endTime = System.currentTimeMillis();
        System.out.println("Depreciation calculation took " + (endTime - startTime) + " ms");
        
        return ResponseEntity.ok(response);
    }
}
