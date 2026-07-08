package com.mygutachter.controller;

import com.mygutachter.model.VehicleIdentification;
import com.mygutachter.model.VehicleResponse;
import com.mygutachter.model.VinRequest;
import com.mygutachter.service.DatService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/dat")
@CrossOrigin(origins = "*")
public class DatController {

    private final DatService datService;

    public DatController(DatService datService) {
        this.datService = datService;
    }

    @PostMapping("/vin-lookup")
    public ResponseEntity<VehicleResponse> vinLookup(@RequestBody VinRequest request) {
        try {
            VehicleResponse result = datService.lookupVin(request.getVin());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
