package com.company.knowledge.repository;

import com.company.knowledge.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {

    Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String email);

    Page<User> findByDepartmentId(Long departmentId, Pageable pageable);

    Page<User> findByEnabledTrue(Pageable pageable);

    @Query("SELECT u FROM User u WHERE u.isDeleted = false " +
           "AND (:keyword IS NULL OR LOWER(u.username) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(u.realName) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(u.email) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
           "AND (:departmentId IS NULL OR u.departmentId = :departmentId) " +
           "AND (:enabled IS NULL OR u.enabled = :enabled)")
    Page<User> findByConditions(
            @Param("keyword") String keyword,
            @Param("departmentId") Long departmentId,
            @Param("enabled") Boolean enabled,
            Pageable pageable);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    boolean existsByDepartmentId(Long departmentId);

    long countByDepartmentId(Long departmentId);
}
