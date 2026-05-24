package com.company.knowledge.common.utils;

import net.sourceforge.pinyin4j.PinyinHelper;
import net.sourceforge.pinyin4j.format.HanyuPinyinCaseType;
import net.sourceforge.pinyin4j.format.HanyuPinyinOutputFormat;
import net.sourceforge.pinyin4j.format.HanyuPinyinToneType;
import net.sourceforge.pinyin4j.format.HanyuPinyinVCharType;
import net.sourceforge.pinyin4j.format.exception.BadHanyuPinyinOutputFormatCombination;
import org.apache.commons.lang3.StringUtils;

public class PinyinUtils {

    private static final HanyuPinyinOutputFormat DEFAULT_FORMAT = new HanyuPinyinOutputFormat();

    static {
        DEFAULT_FORMAT.setCaseType(HanyuPinyinCaseType.LOWERCASE);
        DEFAULT_FORMAT.setToneType(HanyuPinyinToneType.WITHOUT_TONE);
        DEFAULT_FORMAT.setVCharType(HanyuPinyinVCharType.WITH_V);
    }

    public static String toPinyin(String input) {
        if (StringUtils.isBlank(input)) {
            return StringUtils.EMPTY;
        }
        StringBuilder sb = new StringBuilder();
        char[] chars = input.toCharArray();
        for (char ch : chars) {
            try {
                String[] pinyinArray = PinyinHelper.toHanyuPinyinStringArray(ch, DEFAULT_FORMAT);
                if (pinyinArray != null && pinyinArray.length > 0) {
                    sb.append(pinyinArray[0]);
                } else {
                    sb.append(ch);
                }
            } catch (BadHanyuPinyinOutputFormatCombination e) {
                sb.append(ch);
            }
        }
        return sb.toString();
    }

    public static String toFirstLetter(String input) {
        if (StringUtils.isBlank(input)) {
            return StringUtils.EMPTY;
        }
        StringBuilder sb = new StringBuilder();
        char[] chars = input.toCharArray();
        for (char ch : chars) {
            try {
                String[] pinyinArray = PinyinHelper.toHanyuPinyinStringArray(ch, DEFAULT_FORMAT);
                if (pinyinArray != null && pinyinArray.length > 0) {
                    sb.append(pinyinArray[0].charAt(0));
                } else {
                    sb.append(ch);
                }
            } catch (BadHanyuPinyinOutputFormatCombination e) {
                sb.append(ch);
            }
        }
        return sb.toString().toUpperCase();
    }
}
