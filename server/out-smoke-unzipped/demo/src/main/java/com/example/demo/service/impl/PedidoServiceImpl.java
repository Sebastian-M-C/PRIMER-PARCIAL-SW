package com.example.demo.service.impl;

import com.example.demo.dto.PedidoRequest;
import com.example.demo.dto.PedidoResponse;
import com.example.demo.entity.Pedido;
import com.example.demo.repository.PedidoRepository;
import com.example.demo.service.PedidoService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class PedidoServiceImpl implements PedidoService {
    
  private final PedidoRepository pedidoRepository;
    
  @Override
  public PedidoResponse create(PedidoRequest request) {
    Pedido entity = toEntity(request);
    Pedido saved = pedidoRepository.save(entity);
    return toResponse(saved);
  }
    
  @Override
  @Transactional(readOnly = true)
  public PedidoResponse findById(Long id) {
    Pedido entity = pedidoRepository.findById(id)
      .orElseThrow(() -> new RuntimeException("Pedido not found with id: " + id));
    return toResponse(entity);
  }
    
  @Override
  @Transactional(readOnly = true)
  public List<PedidoResponse> findAll() {
    return pedidoRepository.findAll()
      .stream()
      .map(this::toResponse)
      .collect(Collectors.toList());
  }
    
  @Override
  public PedidoResponse update(Long id, PedidoRequest request) {
    Pedido entity = pedidoRepository.findById(id)
      .orElseThrow(() -> new RuntimeException("Pedido not found with id: " + id));
        
    updateEntity(request, entity);
    Pedido updated = pedidoRepository.save(entity);
    return toResponse(updated);
  }
    
  @Override
  public void delete(Long id) {
    if (!pedidoRepository.existsById(id)) {
      throw new RuntimeException("Pedido not found with id: " + id);
    }
    pedidoRepository.deleteById(id);
  }
    
  private Pedido toEntity(PedidoRequest request) {
    return Pedido.builder()
        .build();
  }
    
  private PedidoResponse toResponse(Pedido entity) {
    return PedidoResponse.builder()
                .id(entity.getId())
        .build();
  }
    
  private void updateEntity(PedidoRequest request, Pedido entity) {
  }
}