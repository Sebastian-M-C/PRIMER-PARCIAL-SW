package com.example.demo.controller;

import com.example.demo.dto.PedidoRequest;
import com.example.demo.dto.PedidoResponse;
import com.example.demo.service.PedidoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/pedidos")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PedidoController {
    
  private final PedidoService pedidoService;
    
  @PostMapping
  public ResponseEntity<PedidoResponse> create(@Valid @RequestBody PedidoRequest request) {
    PedidoResponse response = pedidoService.create(request);
    return ResponseEntity.status(HttpStatus.CREATED).body(response);
  }
    
  @GetMapping("/{id}")
  public ResponseEntity<PedidoResponse> findById(@PathVariable Long id) {
    PedidoResponse response = pedidoService.findById(id);
    return ResponseEntity.ok(response);
  }
    
  @GetMapping
  public ResponseEntity<List<PedidoResponse>> findAll() {
    List<PedidoResponse> responses = pedidoService.findAll();
    return ResponseEntity.ok(responses);
  }
    
  @PutMapping("/{id}")
  public ResponseEntity<PedidoResponse> update(@PathVariable Long id, @Valid @RequestBody PedidoRequest request) {
    PedidoResponse response = pedidoService.update(id, request);
    return ResponseEntity.ok(response);
  }
    
  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable Long id) {
    pedidoService.delete(id);
    return ResponseEntity.noContent().build();
  }
}