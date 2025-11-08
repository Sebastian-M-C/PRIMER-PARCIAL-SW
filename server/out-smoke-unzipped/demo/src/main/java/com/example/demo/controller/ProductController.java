package com.example.demo.controller;

import com.example.demo.dto.ProductRequest;
import com.example.demo.dto.ProductResponse;
import com.example.demo.service.ProductService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ProductController {
    
  private final ProductService productService;
    
  @PostMapping
  public ResponseEntity<ProductResponse> create(@Valid @RequestBody ProductRequest request) {
    ProductResponse response = productService.create(request);
    return ResponseEntity.status(HttpStatus.CREATED).body(response);
  }
    
  @GetMapping("/{id}")
  public ResponseEntity<ProductResponse> findById(@PathVariable Long id) {
    ProductResponse response = productService.findById(id);
    return ResponseEntity.ok(response);
  }
    
  @GetMapping
  public ResponseEntity<List<ProductResponse>> findAll() {
    List<ProductResponse> responses = productService.findAll();
    return ResponseEntity.ok(responses);
  }
    
  @PutMapping("/{id}")
  public ResponseEntity<ProductResponse> update(@PathVariable Long id, @Valid @RequestBody ProductRequest request) {
    ProductResponse response = productService.update(id, request);
    return ResponseEntity.ok(response);
  }
    
  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable Long id) {
    productService.delete(id);
    return ResponseEntity.noContent().build();
  }
}