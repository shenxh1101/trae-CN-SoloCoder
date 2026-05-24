package com.company.knowledge.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.domain.Page;

import java.io.Serial;
import java.io.Serializable;
import java.util.List;
import java.util.function.Function;
import java.util.stream.Collectors;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PageResult<T> implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private List<T> list;

    private long total;

    private int pageNum;

    private int pageSize;

    private int pages;

    public static <T> PageResult<T> of(Page<T> page) {
        return PageResult.<T>builder()
                .list(page.getContent())
                .total(page.getTotalElements())
                .pageNum(page.getNumber() + 1)
                .pageSize(page.getSize())
                .pages(page.getTotalPages())
                .build();
    }

    public static <T, R> PageResult<R> of(Page<T> page, Function<T, R> converter) {
        return PageResult.<R>builder()
                .list(page.getContent().stream().map(converter).collect(Collectors.toList()))
                .total(page.getTotalElements())
                .pageNum(page.getNumber() + 1)
                .pageSize(page.getSize())
                .pages(page.getTotalPages())
                .build();
    }

    public static <T> PageResult<T> of(List<T> list, long total, int pageNum, int pageSize) {
        int pages = (int) Math.ceil((double) total / pageSize);
        return PageResult.<T>builder()
                .list(list)
                .total(total)
                .pageNum(pageNum)
                .pageSize(pageSize)
                .pages(pages)
                .build();
    }
}
