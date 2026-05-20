from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import SurveyViewSet, AdminStatsView

router = DefaultRouter()
router.register(r'surveys', SurveyViewSet, basename='survey')
router.register(r'admin', AdminStatsView, basename='admin')

urlpatterns = [
    path('', include(router.urls)),
]
