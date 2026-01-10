package com.entretienbatiment.backend.workorders.service;

import com.entretienbatiment.backend.auth.AppUser;
import com.entretienbatiment.backend.auth.AppUserRepository;
import com.entretienbatiment.backend.workorders.data.WorkOrderRepository;
import com.entretienbatiment.backend.workorders.domain.WorkOrder;
import com.entretienbatiment.backend.workorders.domain.WorkOrderPriority;
import com.entretienbatiment.backend.workorders.domain.WorkOrderStatus;
import com.entretienbatiment.backend.workorders.web.admin.dto.WorkOrderResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for WorkOrderService Kanban ordering functionality.
 * 
 * ORDERING RULES TESTED:
 * 1. Items with non-null sortIndex come first, ordered by sortIndex ASC
 * 2. Items with null sortIndex come after, ordered by priority DESC, then createdAt DESC
 * 3. Reorder within column sets sortIndex = array index
 * 4. Move across columns updates status and assigns sortIndex at new position
 * 5. New work orders are inserted based on priority without reshuffling existing items
 */
@ExtendWith(MockitoExtension.class)
class WorkOrderServiceKanbanTest {

    @Mock
    private WorkOrderRepository repo;

    @Mock
    private AppUserRepository users;

    @InjectMocks
    private WorkOrderService service;

    private AppUser testUser;

    @BeforeEach
    void setUp() {
        testUser = createTestUser(1L, "admin@test.com");
    }

    // ==================== HELPER METHODS ====================

    private AppUser createTestUser(Long id, String email) {
        // Note: Using reflection or a test constructor to set ID
        // In a real scenario, you might use a test builder
        AppUser user = new AppUser();
        try {
            var idField = AppUser.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(user, id);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return user;
    }

    private WorkOrder createWorkOrder(Long id, String title, WorkOrderPriority priority, 
                                       WorkOrderStatus status, Integer sortIndex, Instant createdAt) {
        WorkOrder wo = new WorkOrder(title, "desc", "location", priority, testUser, null, null);
        try {
            var idField = WorkOrder.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(wo, id);

            var createdAtField = WorkOrder.class.getDeclaredField("createdAt");
            createdAtField.setAccessible(true);
            createdAtField.set(wo, createdAt);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        wo.setStatus(status);
        wo.setSortIndex(sortIndex);
        return wo;
    }

    // ==================== TEST: Initial Priority Ordering ====================

    @Nested
    @DisplayName("Initial Priority Ordering (when sortIndex is null)")
    class InitialPriorityOrderingTests {

        @Test
        @DisplayName("should order by priority DESC when all sortIndex are null")
        void shouldOrderByPriorityWhenNoSortIndex() {
            // Given: 4 work orders with null sortIndex and different priorities
            Instant now = Instant.now();
            List<WorkOrder> workOrders = List.of(
                createWorkOrder(1L, "Low Priority", WorkOrderPriority.LOW, WorkOrderStatus.OPEN, null, now),
                createWorkOrder(2L, "High Priority", WorkOrderPriority.HIGH, WorkOrderStatus.OPEN, null, now),
                createWorkOrder(3L, "Urgent Priority", WorkOrderPriority.URGENT, WorkOrderStatus.OPEN, null, now),
                createWorkOrder(4L, "Medium Priority", WorkOrderPriority.MEDIUM, WorkOrderStatus.OPEN, null, now)
            );

            // The repository query should return items already sorted
            // Expected order: URGENT, HIGH, MEDIUM, LOW
            List<WorkOrder> sortedOrders = List.of(
                workOrders.get(2), // URGENT
                workOrders.get(1), // HIGH
                workOrders.get(3), // MEDIUM
                workOrders.get(0)  // LOW
            );

            when(repo.findByStatusOrderedForKanban("OPEN")).thenReturn(sortedOrders);

            // When
            List<WorkOrderResponse> result = service.listByStatusForKanban(WorkOrderStatus.OPEN);

            // Then
            assertThat(result).hasSize(4);
            assertThat(result.get(0).title()).isEqualTo("Urgent Priority");
            assertThat(result.get(1).title()).isEqualTo("High Priority");
            assertThat(result.get(2).title()).isEqualTo("Medium Priority");
            assertThat(result.get(3).title()).isEqualTo("Low Priority");
        }

        @Test
        @DisplayName("items with sortIndex should come before items without sortIndex")
        void shouldPrioritizeSortIndexOverPriority() {
            // Given: mix of items with and without sortIndex
            Instant now = Instant.now();
            WorkOrder withSortIndex = createWorkOrder(1L, "Manual Order", WorkOrderPriority.LOW, WorkOrderStatus.OPEN, 0, now);
            WorkOrder withoutSortIndex = createWorkOrder(2L, "Priority Order", WorkOrderPriority.URGENT, WorkOrderStatus.OPEN, null, now);

            // Repository returns items with sortIndex first
            List<WorkOrder> sortedOrders = List.of(withSortIndex, withoutSortIndex);
            when(repo.findByStatusOrderedForKanban("OPEN")).thenReturn(sortedOrders);

            // When
            List<WorkOrderResponse> result = service.listByStatusForKanban(WorkOrderStatus.OPEN);

            // Then
            assertThat(result).hasSize(2);
            assertThat(result.get(0).title()).isEqualTo("Manual Order"); // sortIndex=0, comes first
            assertThat(result.get(1).title()).isEqualTo("Priority Order"); // sortIndex=null, comes after
        }
    }

    // ==================== TEST: Reorder Within Column ====================

    @Nested
    @DisplayName("Reorder Within Column")
    class ReorderWithinColumnTests {

        @Test
        @DisplayName("should set sortIndex = array index for each id")
        void shouldSetSortIndexToArrayIndex() {
            // Given: 3 work orders in OPEN status
            Instant now = Instant.now();
            WorkOrder wo1 = createWorkOrder(1L, "WO 1", WorkOrderPriority.LOW, WorkOrderStatus.OPEN, 0, now);
            WorkOrder wo2 = createWorkOrder(2L, "WO 2", WorkOrderPriority.MEDIUM, WorkOrderStatus.OPEN, 1, now);
            WorkOrder wo3 = createWorkOrder(3L, "WO 3", WorkOrderPriority.HIGH, WorkOrderStatus.OPEN, 2, now);

            when(repo.findByIdIn(List.of(3L, 1L, 2L))).thenReturn(List.of(wo1, wo2, wo3));

            // When: reorder to [3, 1, 2]
            service.reorderWorkOrdersInColumn(WorkOrderStatus.OPEN, List.of(3L, 1L, 2L));

            // Then: sortIndex should be updated
            assertThat(wo3.getSortIndex()).isEqualTo(0);
            assertThat(wo1.getSortIndex()).isEqualTo(1);
            assertThat(wo2.getSortIndex()).isEqualTo(2);

            verify(repo).saveAll(anyList());
        }

        @Test
        @DisplayName("should throw exception if work order does not belong to status")
        void shouldThrowIfWorkOrderNotInStatus() {
            // Given: work order in wrong status
            Instant now = Instant.now();
            WorkOrder wo = createWorkOrder(1L, "WO 1", WorkOrderPriority.LOW, WorkOrderStatus.IN_PROGRESS, 0, now);

            when(repo.findByIdIn(List.of(1L))).thenReturn(List.of(wo));

            // When/Then
            assertThatThrownBy(() -> service.reorderWorkOrdersInColumn(WorkOrderStatus.OPEN, List.of(1L)))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("does not belong to status");
        }

        @Test
        @DisplayName("should throw exception if some IDs are not found")
        void shouldThrowIfSomeIdsNotFound() {
            // Given: only 2 out of 3 IDs exist
            Instant now = Instant.now();
            WorkOrder wo1 = createWorkOrder(1L, "WO 1", WorkOrderPriority.LOW, WorkOrderStatus.OPEN, 0, now);

            when(repo.findByIdIn(List.of(1L, 2L, 3L))).thenReturn(List.of(wo1));

            // When/Then
            assertThatThrownBy(() -> service.reorderWorkOrdersInColumn(WorkOrderStatus.OPEN, List.of(1L, 2L, 3L)))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("not found");
        }
    }

    // ==================== TEST: Move Across Columns ====================

    @Nested
    @DisplayName("Move Across Columns")
    class MoveAcrossColumnsTests {

        @Test
        @DisplayName("should update status and sortIndex when moving to new column")
        void shouldUpdateStatusAndSortIndexOnMove() {
            // Given: work order in OPEN status
            Instant now = Instant.now();
            WorkOrder woToMove = createWorkOrder(1L, "Move Me", WorkOrderPriority.HIGH, WorkOrderStatus.OPEN, 0, now);
            WorkOrder existingInDest = createWorkOrder(2L, "Existing", WorkOrderPriority.MEDIUM, WorkOrderStatus.IN_PROGRESS, 0, now);

            when(repo.findById(1L)).thenReturn(Optional.of(woToMove));
            when(repo.findByStatusOrderedForKanban("IN_PROGRESS"))
                .thenReturn(new ArrayList<>(List.of(existingInDest)));
            when(repo.findByStatusOrderedForKanban("OPEN"))
                .thenReturn(new ArrayList<>());

            // When: move to IN_PROGRESS at index 0
            WorkOrderResponse result = service.moveWorkOrder(1L, WorkOrderStatus.IN_PROGRESS, 0);

            // Then
            assertThat(result.status()).isEqualTo(WorkOrderStatus.IN_PROGRESS);
            assertThat(woToMove.getStatus()).isEqualTo(WorkOrderStatus.IN_PROGRESS);
            assertThat(woToMove.getSortIndex()).isEqualTo(0);
            assertThat(existingInDest.getSortIndex()).isEqualTo(1);

            verify(repo, times(2)).saveAll(anyList());
        }

        @Test
        @DisplayName("should clamp newIndex to valid range")
        void shouldClampNewIndexToValidRange() {
            // Given
            Instant now = Instant.now();
            WorkOrder woToMove = createWorkOrder(1L, "Move Me", WorkOrderPriority.HIGH, WorkOrderStatus.OPEN, 0, now);

            when(repo.findById(1L)).thenReturn(Optional.of(woToMove));
            when(repo.findByStatusOrderedForKanban("IN_PROGRESS"))
                .thenReturn(new ArrayList<>());
            when(repo.findByStatusOrderedForKanban("OPEN"))
                .thenReturn(new ArrayList<>());

            // When: move with newIndex = 100 (way out of range)
            service.moveWorkOrder(1L, WorkOrderStatus.IN_PROGRESS, 100);

            // Then: should be clamped to 0 (only item in column)
            assertThat(woToMove.getSortIndex()).isEqualTo(0);
        }

        @Test
        @DisplayName("should throw exception if work order not found")
        void shouldThrowIfWorkOrderNotFound() {
            when(repo.findById(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.moveWorkOrder(999L, WorkOrderStatus.IN_PROGRESS, 0))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("not found");
        }
    }

    // ==================== TEST: New Work Order Insertion ====================

    @Nested
    @DisplayName("New Work Order Insertion")
    class NewWorkOrderInsertionTests {

        @Test
        @DisplayName("should insert URGENT at the beginning when column has lower priority items")
        void shouldInsertUrgentAtBeginning() {
            // Given: column has MEDIUM and LOW priority items
            Instant now = Instant.now();
            WorkOrder existing1 = createWorkOrder(1L, "Medium", WorkOrderPriority.MEDIUM, WorkOrderStatus.OPEN, 0, now);
            WorkOrder existing2 = createWorkOrder(2L, "Low", WorkOrderPriority.LOW, WorkOrderStatus.OPEN, 1, now);

            WorkOrder newWo = createWorkOrder(3L, "New Urgent", WorkOrderPriority.URGENT, WorkOrderStatus.OPEN, null, now);

            when(repo.findByStatusOrderedForKanban("OPEN"))
                .thenReturn(new ArrayList<>(List.of(existing1, existing2)));

            // When
            service.assignSortIndexForNewWorkOrder(newWo);

            // Then: new URGENT should be at index 0
            assertThat(newWo.getSortIndex()).isEqualTo(0);
        }

        @Test
        @DisplayName("should insert LOW at the end when column has higher priority items")
        void shouldInsertLowAtEnd() {
            // Given: column has URGENT and HIGH priority items
            Instant now = Instant.now();
            WorkOrder existing1 = createWorkOrder(1L, "Urgent", WorkOrderPriority.URGENT, WorkOrderStatus.OPEN, 0, now);
            WorkOrder existing2 = createWorkOrder(2L, "High", WorkOrderPriority.HIGH, WorkOrderStatus.OPEN, 1, now);

            WorkOrder newWo = createWorkOrder(3L, "New Low", WorkOrderPriority.LOW, WorkOrderStatus.OPEN, null, now.plusSeconds(1));

            when(repo.findByStatusOrderedForKanban("OPEN"))
                .thenReturn(new ArrayList<>(List.of(existing1, existing2)));

            // When
            service.assignSortIndexForNewWorkOrder(newWo);

            // Then: new LOW should be at index 2 (end)
            assertThat(newWo.getSortIndex()).isEqualTo(2);
        }

        @Test
        @DisplayName("should assign sortIndex 0 when column is empty")
        void shouldAssignSortIndexZeroForEmptyColumn() {
            // Given: empty column
            WorkOrder newWo = createWorkOrder(1L, "First", WorkOrderPriority.MEDIUM, WorkOrderStatus.OPEN, null, Instant.now());

            when(repo.findByStatusOrderedForKanban("OPEN"))
                .thenReturn(new ArrayList<>());

            // When
            service.assignSortIndexForNewWorkOrder(newWo);

            // Then
            assertThat(newWo.getSortIndex()).isEqualTo(0);
        }
    }
}
