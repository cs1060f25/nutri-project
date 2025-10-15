from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import User

@api_view(['GET'])
def health_check(request):
    return Response({'status': 'ok', 'message': 'CrimsonFuel Django API running'})

@api_view(['POST'])
def complete_onboarding(request):
    try:
        data = request.data
        
        # Create user with allergy-aware profile
        user = User.objects.create(
            name=data.get('name'),
            allergies=data.get('allergies', []),
            diet_goal=data.get('dietGoal'),
            activity_level=data.get('activityLevel')
        )
        
        return Response({
            'success': True,
            'message': 'Profile created successfully',
            'user': {
                'id': user.id,
                'name': user.name,
                'allergies': user.allergies,
                'dietGoal': user.diet_goal,
                'activityLevel': user.activity_level,
                'safetyBadge': 'verified'  # Mock safety badge
            }
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)
