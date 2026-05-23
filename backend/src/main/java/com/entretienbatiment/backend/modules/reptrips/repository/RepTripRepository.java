package com.entretienbatiment.backend.modules.reptrips.repository;

import com.entretienbatiment.backend.modules.reptrips.model.RepTrip;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface RepTripRepository extends JpaRepository<RepTrip, Long> {

    List<RepTrip> findByUserIdOrderByDateDescCreatedAtDesc(Long userId);

    @Query("SELECT t FROM RepTrip t WHERE t.userId = :userId AND t.status = 'IN_PROGRESS' ORDER BY t.createdAt DESC")
    List<RepTrip> findActiveByUserId(@Param("userId") Long userId);

    @Query("SELECT t FROM RepTrip t ORDER BY t.date DESC, t.createdAt DESC")
    List<RepTrip> findAllOrderByDateDesc();

    @Query("SELECT t FROM RepTrip t WHERE t.date BETWEEN :start AND :end ORDER BY t.date DESC")
    List<RepTrip> findByDateBetween(@Param("start") LocalDate start, @Param("end") LocalDate end);

    @Query("SELECT t FROM RepTrip t WHERE t.userId = :userId AND t.date BETWEEN :start AND :end ORDER BY t.date DESC")
    List<RepTrip> findByUserIdAndDateBetween(@Param("userId") Long userId,
                                              @Param("start") LocalDate start,
                                              @Param("end") LocalDate end);
}
