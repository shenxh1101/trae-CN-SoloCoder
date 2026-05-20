from rest_framework import serializers
from .models import Survey, Question, Option, LogicJump, SurveyResponse, Answer


class OptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Option
        fields = ['id', 'text', 'order']
        extra_kwargs = {'id': {'required': False, 'read_only': False}}


class LogicJumpSerializer(serializers.ModelSerializer):
    option_id = serializers.SerializerMethodField()
    target_question_id = serializers.SerializerMethodField()

    class Meta:
        model = LogicJump
        fields = ['id', 'option_id', 'target_question_id', 'end_survey']
        extra_kwargs = {'id': {'required': False, 'read_only': False}}

    def get_option_id(self, obj):
        return str(obj.option.id) if obj.option else None

    def get_target_question_id(self, obj):
        return str(obj.target_question.id) if obj.target_question else None


class LogicJumpWriteSerializer(serializers.Serializer):
    id = serializers.CharField(required=False, allow_null=True)
    option_id = serializers.UUIDField()
    target_question_id = serializers.UUIDField(required=False, allow_null=True)
    end_survey = serializers.BooleanField(required=False, default=False)


class QuestionSerializer(serializers.ModelSerializer):
    options = OptionSerializer(many=True, required=False)
    logic_jumps = serializers.ListField(required=False, write_only=True)

    class Meta:
        model = Question
        fields = ['id', 'title', 'question_type', 'order', 'required', 'max_rating', 'options', 'logic_jumps']
        extra_kwargs = {'id': {'required': False, 'read_only': False}}

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        ret['logic_jumps'] = LogicJumpSerializer(instance.logic_jumps.all(), many=True).data
        return ret


class SurveyListSerializer(serializers.ModelSerializer):
    response_count = serializers.IntegerField(read_only=True)
    average_completion_time = serializers.IntegerField(read_only=True)

    class Meta:
        model = Survey
        fields = ['id', 'title', 'description', 'status', 'created_at', 'published_at', 'response_count', 'average_completion_time', 'qr_code']


class SurveyPublicSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, read_only=True)

    class Meta:
        model = Survey
        fields = ['id', 'title', 'description', 'allow_anonymous', 'require_login', 'questions']


class SurveySerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, required=False)
    response_count = serializers.IntegerField(read_only=True)
    average_completion_time = serializers.IntegerField(read_only=True)

    class Meta:
        model = Survey
        fields = ['id', 'title', 'description', 'status', 'created_at', 'updated_at', 'published_at', 'expired_at', 'allow_anonymous', 'require_login', 'questions', 'response_count', 'average_completion_time', 'qr_code']
        read_only_fields = ['id', 'created_at', 'updated_at', 'qr_code']

    def create(self, validated_data):
        questions_data = validated_data.pop('questions', [])
        survey = Survey.objects.create(**validated_data)
        self._create_questions(survey, questions_data)
        return survey

    def update(self, instance, validated_data):
        questions_data = validated_data.pop('questions', [])
        instance.title = validated_data.get('title', instance.title)
        instance.description = validated_data.get('description', instance.description)
        instance.status = validated_data.get('status', instance.status)
        instance.expired_at = validated_data.get('expired_at', instance.expired_at)
        instance.allow_anonymous = validated_data.get('allow_anonymous', instance.allow_anonymous)
        instance.require_login = validated_data.get('require_login', instance.require_login)
        instance.save()

        if questions_data:
            instance.questions.all().delete()
            self._create_questions(instance, questions_data)

        return instance

    def _create_questions(self, survey, questions_data):
        created_questions = {}
        all_logic_jumps = []
        
        for question_data in questions_data:
            options_data = question_data.pop('options', [])
            logic_jumps_data = question_data.pop('logic_jumps', [])
            question = Question.objects.create(survey=survey, **question_data)
            created_questions[question.id] = question
            
            for option_data in options_data:
                Option.objects.create(question=question, **option_data)
            
            for lj_data in logic_jumps_data:
                all_logic_jumps.append((question.id, lj_data))
        
        for question_id, lj_data in all_logic_jumps:
            question = created_questions.get(question_id)
            if not question:
                continue
            
            option_id = lj_data.get('option_id')
            target_question_id = lj_data.get('target_question_id')
            end_survey = lj_data.get('end_survey', False)
            
            try:
                option = Option.objects.get(id=option_id, question=question)
            except Option.DoesNotExist:
                continue
            
            target_question = None
            if target_question_id and not end_survey:
                target_question = created_questions.get(target_question_id)
            
            LogicJump.objects.create(
                question=question,
                option=option,
                target_question=target_question,
                end_survey=end_survey
            )


class AnswerCreateSerializer(serializers.Serializer):
    question_id = serializers.UUIDField()
    text_answer = serializers.CharField(required=False, allow_blank=True)
    rating_value = serializers.IntegerField(required=False, allow_null=True)
    selected_option_ids = serializers.ListField(child=serializers.UUIDField(), required=False)


class SurveyResponseCreateSerializer(serializers.ModelSerializer):
    answers = AnswerCreateSerializer(many=True)

    class Meta:
        model = SurveyResponse
        fields = ['respondent_name', 'respondent_email', 'answers']

    def create(self, validated_data):
        answers_data = validated_data.pop('answers')
        survey_id = self.context['survey_id']
        ip_address = self.context.get('ip_address')
        respondent = self.context.get('respondent')

        survey = Survey.objects.get(id=survey_id)
        response = SurveyResponse.objects.create(
            survey=survey,
            respondent=respondent,
            ip_address=ip_address,
            completed=True,
            **validated_data
        )

        for answer_data in answers_data:
            question_id = answer_data.pop('question_id', None)
            selected_option_ids = answer_data.pop('selected_option_ids', [])
            
            try:
                question = Question.objects.get(id=question_id, survey=survey)
            except Question.DoesNotExist:
                continue
            
            answer = Answer.objects.create(
                response=response,
                question=question,
                **answer_data
            )
            if selected_option_ids:
                options = Option.objects.filter(id__in=selected_option_ids, question=question)
                answer.selected_options.set(options)

        return response


class AnswerDetailSerializer(serializers.ModelSerializer):
    selected_options = OptionSerializer(many=True, read_only=True)
    question_title = serializers.CharField(source='question.title', read_only=True)

    class Meta:
        model = Answer
        fields = ['question_id', 'question_title', 'text_answer', 'rating_value', 'selected_options']


class SurveyResponseDetailSerializer(serializers.ModelSerializer):
    answers = AnswerDetailSerializer(many=True, read_only=True)

    class Meta:
        model = SurveyResponse
        fields = ['id', 'respondent_name', 'respondent_email', 'started_at', 'completed_at', 'answers']


class SurveyStatsSerializer(serializers.Serializer):
    question_id = serializers.UUIDField()
    question_title = serializers.CharField()
    question_type = serializers.CharField()
    stats = serializers.SerializerMethodField()

    def get_stats(self, obj):
        return obj.get('stats', {})
