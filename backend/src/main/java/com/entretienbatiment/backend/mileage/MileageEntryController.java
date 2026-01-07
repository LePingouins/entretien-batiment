package com.entretienbatiment.backend.mileage;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/mileage")
public class MileageEntryController {
    @Autowired
    private MileageEntryRepository repository;

    @GetMapping
    public List<MileageEntry> getAll() {
        return repository.findAll();
    }

    @PostMapping
    public MileageEntry create(@RequestBody MileageEntry entry) {
        return repository.save(entry);
    }

    @PutMapping("/{id}")
    public MileageEntry update(@PathVariable Long id, @RequestBody MileageEntry entry) {
        entry.setId(id);
        return repository.save(entry);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        repository.deleteById(id);
    }
}
