from django.contrib import admin
from .models import Survey, Question, Option, LogicJump, SurveyResponse, Answer


class QuestionInline(admin.TabularInline):
    model = Question
    extra = 0
    show_change_link = True


class OptionInline(admin.TabularInline):
    model = Option
    extra = 0


@admin.register(Survey)
class SurveyAdmin(admin.ModelAdmin):
    list_display = ('title', 'creator', 'status', 'response_count', 'created_at', 'published_at')
    list_filter = ('status', 'created_at', 'published_at')
    search_fields = ('title', 'description', 'creator__username')
    inlines = [QuestionInline]
    readonly_fields = ('created_at', 'updated_at', 'response_count', 'average_completion_time')

    def response_count(self, obj):
        return obj.response_count
    response_count.short_description = '回收份数'

    def average_completion_time(self, obj):
        seconds = obj.average_completion_time
        if seconds < 60:
            return f"{seconds}秒"
        return f"{seconds // 60}分{seconds % 60}秒"
    average_completion_time.short_description = '平均完成时间'


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ('survey', 'title', 'question_type', 'order', 'required')
    list_filter = ('question_type', 'required')
    search_fields = ('title', 'survey__title')
    inlines = [OptionInline]


@admin.register(Option)
class OptionAdmin(admin.ModelAdmin):
    list_display = ('question', 'text', 'order')
    search_fields = ('text', 'question__title')


@admin.register(LogicJump)
class LogicJumpAdmin(admin.ModelAdmin):
    list_display = ('question', 'option', 'target_question', 'end_survey')
    list_filter = ('end_survey',)


@admin.register(SurveyResponse)
class SurveyResponseAdmin(admin.ModelAdmin):
    list_display = ('survey', 'respondent_name', 'completed', 'started_at', 'completed_at', 'ip_address')
    list_filter = ('completed', 'started_at', 'completed_at')
    search_fields = ('respondent_name', 'respondent_email', 'survey__title')
    readonly_fields = ('started_at', 'completed_at', 'ip_address')


@admin.register(Answer)
class AnswerAdmin(admin.ModelAdmin):
    list_display = ('response', 'question', 'text_answer', 'rating_value')
    list_filter = ('question__question_type',)
    search_fields = ('text_answer', 'question__title')
