package com.entretienbatiment.backend.modules.notifications.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import com.entretienbatiment.backend.modules.notifications.model.Notification;

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
    @Query("UPDATE Notification n SET n.isRead = true WHERE n.targetUserId = :userId AND n.bugReportId = :bugReportId")
    void markBugReportAsRead(Long userId, Long bugReportId);

    @Query("SELECT DISTINCT n.targetUserId FROM Notification n WHERE n.bugReportId = :bugReportId AND n.targetUserId IS NOT NULL")
    List<Long> findDistinctTargetUserIdsByBugReportId(Long bugReportId);

    @Modifying
    @Query("UPDATE Notification n SET n.title = :title, n.message = :message, n.href = :href WHERE n.bugReportId = :bugReportId AND n.source = 'bug-report-feature'")
    void updateBugReportFeaturePayload(Long bugReportId, String title, String message, String href);

    @Modifying
    @Query("DELETE FROM Notification n WHERE n.targetUserId = :userId AND n.id = :notificationId")
    void deleteForUser(Long userId, String notificationId);

    @Modifying
    @Query("DELETE FROM Notification n WHERE n.bugReportId = :bugReportId AND n.targetUserId = :userId")
    void deleteBugReportForUser(Long bugReportId, Long userId);

    @Modifying
    @Query("DELETE FROM Notification n WHERE n.bugReportId = :bugReportId AND n.targetUserId IN :userIds")
    void deleteBugReportForUsers(Long bugReportId, List<Long> userIds);

    @Modifying
    @Query("DELETE FROM Notification n WHERE n.bugReportId = :bugReportId")
    void deleteAllForBugReport(Long bugReportId);
}
