import uuid
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()


class Survey(models.Model):
    STATUS_CHOICES = (
        ('draft', '草稿'),
        ('published', '已发布'),
        ('closed', '已关闭'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200, verbose_name='问卷标题')
    description = models.TextField(blank=True, verbose_name='问卷描述')
    creator = models.ForeignKey(User, on_delete=models.CASCADE, related_name='surveys', verbose_name='创建者')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft', verbose_name='状态')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')
    published_at = models.DateTimeField(null=True, blank=True, verbose_name='发布时间')
    expired_at = models.DateTimeField(null=True, blank=True, verbose_name='过期时间')
    allow_anonymous = models.BooleanField(default=True, verbose_name='允许匿名填写')
    require_login = models.BooleanField(default=False, verbose_name='需要登录')
    qr_code = models.ImageField(upload_to='qrcodes/', blank=True, null=True, verbose_name='二维码')

    class Meta:
        db_table = 'survey'
        ordering = ['-created_at']
        verbose_name = '问卷'
        verbose_name_plural = verbose_name

    def __str__(self):
        return self.title

    @property
    def response_count(self):
        return self.responses.count()

    @property
    def average_completion_time(self):
        durations = []
        for resp in self.responses.filter(completed=True):
            if resp.started_at and resp.completed_at:
                durations.append((resp.completed_at - resp.started_at).total_seconds())
        if durations:
            return int(sum(durations) / len(durations))
        return 0

    def publish(self):
        self.status = 'published'
        self.published_at = timezone.now()
        self.save()
        self.generate_qr_code()

    def generate_qr_code(self):
        import qrcode
        from django.conf import settings
        from django.core.files.base import ContentFile
        import io

        url = f"{settings.FRONTEND_URL}/survey/{self.id}"
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(url)
        qr.make(fit=True)
        img = qr.make_image(fill='black', back_color='white')
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        filename = f'qrcode_{self.id}.png'
        self.qr_code.save(filename, ContentFile(buffer.getvalue()), save=True)


class Question(models.Model):
    QUESTION_TYPES = (
        ('single_choice', '单选题'),
        ('multiple_choice', '多选题'),
        ('text', '文本题'),
        ('rating', '评分题'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    survey = models.ForeignKey(Survey, on_delete=models.CASCADE, related_name='questions', verbose_name='问卷')
    title = models.CharField(max_length=500, verbose_name='题目标题')
    question_type = models.CharField(max_length=20, choices=QUESTION_TYPES, verbose_name='题型')
    order = models.IntegerField(default=0, verbose_name='排序')
    required = models.BooleanField(default=True, verbose_name='必填')
    max_rating = models.IntegerField(default=5, null=True, blank=True, verbose_name='最大评分')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')

    class Meta:
        db_table = 'question'
        ordering = ['order', 'created_at']
        verbose_name = '题目'
        verbose_name_plural = verbose_name

    def __str__(self):
        return f"{self.survey.title} - {self.title[:30]}"


class Option(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='options', verbose_name='题目')
    text = models.CharField(max_length=500, verbose_name='选项内容')
    order = models.IntegerField(default=0, verbose_name='排序')

    class Meta:
        db_table = 'option'
        ordering = ['order']
        verbose_name = '选项'
        verbose_name_plural = verbose_name

    def __str__(self):
        return self.text


class LogicJump(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='logic_jumps', verbose_name='当前题目')
    option = models.ForeignKey(Option, on_delete=models.CASCADE, related_name='logic_jumps', verbose_name='选项')
    target_question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='target_jumps', null=True, blank=True, verbose_name='跳转到题目')
    end_survey = models.BooleanField(default=False, verbose_name='结束问卷')

    class Meta:
        db_table = 'logic_jump'
        verbose_name = '逻辑跳转'
        verbose_name_plural = verbose_name

    def __str__(self):
        if self.end_survey:
            return f"{self.question.title} -> 结束"
        return f"{self.question.title} -> {self.target_question.title if self.target_question else '无'}"


class SurveyResponse(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    survey = models.ForeignKey(Survey, on_delete=models.CASCADE, related_name='responses', verbose_name='问卷')
    respondent = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='responses', verbose_name='回答者')
    respondent_name = models.CharField(max_length=100, blank=True, null=True, verbose_name='回答者姓名')
    respondent_email = models.EmailField(blank=True, null=True, verbose_name='回答者邮箱')
    started_at = models.DateTimeField(auto_now_add=True, verbose_name='开始时间')
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name='完成时间')
    completed = models.BooleanField(default=False, verbose_name='是否完成')
    ip_address = models.GenericIPAddressField(null=True, blank=True, verbose_name='IP地址')

    class Meta:
        db_table = 'survey_response'
        ordering = ['-started_at']
        verbose_name = '问卷回答'
        verbose_name_plural = verbose_name

    def __str__(self):
        return f"{self.survey.title} - {self.id}"


class Answer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    response = models.ForeignKey(SurveyResponse, on_delete=models.CASCADE, related_name='answers', verbose_name='回答')
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='answers', verbose_name='题目')
    text_answer = models.TextField(blank=True, null=True, verbose_name='文本回答')
    rating_value = models.IntegerField(null=True, blank=True, verbose_name='评分值')
    selected_options = models.ManyToManyField(Option, related_name='answers', blank=True, verbose_name='选择的选项')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')

    class Meta:
        db_table = 'answer'
        verbose_name = '答案'
        verbose_name_plural = verbose_name

    def __str__(self):
        return f"Answer for {self.question.title}"
