package com.company.knowledge.repository;

import com.company.knowledge.entity.HotRanking;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface HotRankingRepository extends JpaRepository<HotRanking, Long>, JpaSpecificationExecutor<HotRanking> {

    @Query("SELECT hr FROM HotRanking hr WHERE hr.rankingType = :type AND hr.rankingDate = :date ORDER BY hr.score DESC")
    List<HotRanking> findByTypeAndDateOrderByScoreDesc(@Param("type") String type, @Param("date") LocalDate date);

    @Query("SELECT hr FROM HotRanking hr WHERE hr.rankingType = :type AND hr.rankingDate = :date ORDER BY hr.rankPosition ASC")
    Page<HotRanking> findByTypeAndDateOrderByRankAsc(@Param("type") String type, @Param("date") LocalDate date, Pageable pageable);

    Optional<HotRanking> findByDocumentIdAndRankingTypeAndRankingDate(Long documentId, String rankingType, LocalDate rankingDate);

    void deleteByRankingDateBefore(LocalDate date);
}
