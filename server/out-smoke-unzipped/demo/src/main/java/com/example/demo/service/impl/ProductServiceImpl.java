package com.example.demo.service.impl;

import com.example.demo.dto.ProductRequest;
import com.example.demo.dto.ProductResponse;
import com.example.demo.entity.Product;
import com.example.demo.repository.ProductRepository;
import com.example.demo.service.ProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class ProductServiceImpl implements ProductService {
    
  private final ProductRepository productRepository;
    
  @Override
  public ProductResponse create(ProductRequest request) {
    Product entity = toEntity(request);
    Product saved = productRepository.save(entity);
    return toResponse(saved);
  }
    
  @Override
  @Transactional(readOnly = true)
  public ProductResponse findById(Long id) {
    Product entity = productRepository.findById(id)
      .orElseThrow(() -> new RuntimeException("Product not found with id: " + id));
    return toResponse(entity);
  }
    
  @Override
  @Transactional(readOnly = true)
  public List<ProductResponse> findAll() {
    return productRepository.findAll()
      .stream()
      .map(this::toResponse)
      .collect(Collectors.toList());
  }
    
  @Override
  public ProductResponse update(Long id, ProductRequest request) {
    Product entity = productRepository.findById(id)
      .orElseThrow(() -> new RuntimeException("Product not found with id: " + id));
        
    updateEntity(request, entity);
    Product updated = productRepository.save(entity);
    return toResponse(updated);
  }
    
  @Override
  public void delete(Long id) {
    if (!productRepository.existsById(id)) {
      throw new RuntimeException("Product not found with id: " + id);
    }
    productRepository.deleteById(id);
  }
    
  private Product toEntity(ProductRequest request) {
    return Product.builder()
                .name(request.getName())
        .build();
  }
    
  private ProductResponse toResponse(Product entity) {
    return ProductResponse.builder()
                .id(entity.getId())
                .name(entity.getName())
        .build();
  }
    
  private void updateEntity(ProductRequest request, Product entity) {
        if (request.getName() != null) {
            entity.setName(request.getName());
        }
  }
}