package com.entretienbatiment.backend.modules.dev;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dev")
@ConditionalOnProperty(name = "app.dev.enable-test-endpoints", havingValue = "true")
public class DevTestController {

    @GetMapping("/throw")
    public ResponseEntity<String> throwError() {
        throw new RuntimeException("Test exception from DevTestController");
    }
}
