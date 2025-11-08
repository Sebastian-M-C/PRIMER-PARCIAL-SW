package com.example.demo.service;

import com.example.demo.dto.PedidoRequest;
import com.example.demo.dto.PedidoResponse;
import java.util.List;

public interface PedidoService {
    
  PedidoResponse create(PedidoRequest request);
    
  PedidoResponse findById(Long id);
    
  List<PedidoResponse> findAll();
    
  PedidoResponse update(Long id, PedidoRequest request);
    
  void delete(Long id);
}