package com.entretienbatiment.backend;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
        "spring.flyway.enabled=false",
        "spring.datasource.url=jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop"
        ,"security.jwt.secret=abcdefghijklmnopqrstuvwxyz012345"
})
class BackendSmokeTest {

    @Test
    void contextLoads() {
        // Smoke test: context should start without errors (uses in-memory H2 DB)
    }

}
