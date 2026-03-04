package com.entretienbatiment.backend.notifications;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, String> {
    List<Notification> findByTargetUserIdOrderByDateDesc(Long targetUserId);

    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true WHERE n.targetUserId = :userId AND n.isRead = false")
    void markAllAsReadForUser(Long userId);

    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true WHERE n.targetUserId = :userId AND n.id = :notificationId")
    void markAsRead(Long userId, String notificationId);

    @Modifying
    @Query("DELETE FROM Notification n WHERE n.targetUserId = :userId AND n.id = :notificationId")
    void deleteForUser(Long userId, String notificationId);
}
