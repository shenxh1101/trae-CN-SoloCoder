package com.company.knowledge.common.utils;

import org.apache.commons.lang3.StringUtils;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.safety.Safelist;

public class HtmlUtils {

    public static String cleanHtml(String html) {
        if (StringUtils.isBlank(html)) {
            return StringUtils.EMPTY;
        }
        return Jsoup.clean(html, Safelist.relaxed());
    }

    public static String cleanHtmlBasic(String html) {
        if (StringUtils.isBlank(html)) {
            return StringUtils.EMPTY;
        }
        return Jsoup.clean(html, Safelist.basic());
    }

    public static String removeHtml(String html) {
        if (StringUtils.isBlank(html)) {
            return StringUtils.EMPTY;
        }
        return Jsoup.parse(html).text();
    }

    public static String getTitleFromHtml(String html) {
        if (StringUtils.isBlank(html)) {
            return StringUtils.EMPTY;
        }
        Document doc = Jsoup.parse(html);
        return doc.title();
    }

    public static String getMetaDescription(String html) {
        if (StringUtils.isBlank(html)) {
            return StringUtils.EMPTY;
        }
        Document doc = Jsoup.parse(html);
        return doc.select("meta[name=description]").attr("content");
    }

    public static String truncateText(String html, int maxLength) {
        String text = removeHtml(html);
        if (text.length() <= maxLength) {
            return text;
        }
        return text.substring(0, maxLength) + "...";
    }
}
