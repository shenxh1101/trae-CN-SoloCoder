import csv
import io
import uuid
from typing import List, Dict, Tuple


class CSVProcessor:
    @staticmethod
    def parse_emails(file_content: bytes) -> Tuple[List[str], List[Dict]]:
        emails = []
        errors = []
        
        try:
            content = file_content.decode('utf-8-sig')
        except UnicodeDecodeError:
            try:
                content = file_content.decode('gbk')
            except UnicodeDecodeError:
                content = file_content.decode('utf-8', errors='ignore')
        
        reader = csv.reader(io.StringIO(content))
        for row_num, row in enumerate(reader, 1):
            if not row:
                continue
            
            email_content = row[0].strip()
            if not email_content:
                errors.append({"row": row_num, "error": "内容为空"})
                continue
            
            if len(email_content) < 5:
                errors.append({"row": row_num, "error": "内容过短"})
                continue
            
            emails.append(email_content)
        
        return emails, errors

    @staticmethod
    def generate_results_csv(results: List[Dict]) -> bytes:
        output = io.StringIO()
        fieldnames = ["email_id", "content", "summary", "category", "category_confidence",
                     "category_explanation", "sentiment", "sentiment_confidence",
                     "sentiment_explanation", "priority", "priority_score",
                     "priority_explanation", "suggested_response_time"]
        
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        
        for result in results:
            row = {k: result.get(k, "") for k in fieldnames}
            writer.writerow(row)
        
        return output.getvalue().encode('utf-8-sig')

    @staticmethod
    def generate_template_csv() -> bytes:
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["邮件内容"])
        writer.writerow(["您好，请问你们产品的价格是多少？我想咨询一下详细的报价信息。"])
        writer.writerow(["我要投诉！你们的产品质量太差了，用了三天就坏了，要求立即退款！"])
        writer.writerow(["我们公司想和贵司洽谈商务合作，请问负责人联系方式是什么？"])
        writer.writerow(["请帮我取消订阅，我不再需要你们的服务了。"])
        return output.getvalue().encode('utf-8-sig')
