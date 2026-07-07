from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth import authenticate
from .models import User

class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model"""
    full_name = serializers.SerializerMethodField()
    created_by_username = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'full_name',
            'phone', 'address', 'is_active', 'is_staff', 'is_superuser',
            'created_at', 'updated_at', 'last_login', 'created_by',
            'created_by_username'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'last_login', 
            'date_joined', 'created_by', 'created_by_username'
        ]
    
    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username
    
    def get_created_by_username(self, obj):
        if obj.created_by:
            return obj.created_by.username
        return None

class CreateUserSerializer(serializers.ModelSerializer):
    """Serializer for creating a new user"""
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password]
    )
    confirm_password = serializers.CharField(
        write_only=True,
        required=True
    )
    
    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'confirm_password',
            'first_name', 'last_name', 'phone', 'address'
        ]
    
    def validate(self, attrs):
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError({
                "confirm_password": "Password fields didn't match."
            })
        
        # Check if username already exists
        if User.objects.filter(username=attrs['username']).exists():
            raise serializers.ValidationError({
                "username": "A user with this username already exists."
            })
        
        # Check if email already exists (if provided)
        if attrs.get('email') and User.objects.filter(email=attrs['email']).exists():
            raise serializers.ValidationError({
                "email": "A user with this email already exists."
            })
        
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('confirm_password')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            phone=validated_data.get('phone', ''),
            address=validated_data.get('address', '')
        )
        # Set created_by to the current user if available
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            user.created_by = request.user
            user.save()
        return user

class UpdateUserSerializer(serializers.ModelSerializer):
    """Serializer for updating user details"""
    class Meta:
        model = User
        fields = [
            'first_name', 'last_name', 'email', 'phone', 
            'address', 'is_active'
        ]
    
    def validate_email(self, value):
        if value:
            instance = self.instance
            if User.objects.exclude(id=instance.id).filter(email=value).exists():
                raise serializers.ValidationError("This email is already in use.")
        return value
    
    def update(self, instance, validated_data):
        # Prevent updating certain fields
        validated_data.pop('is_superuser', None)
        validated_data.pop('is_staff', None)
        return super().update(instance, validated_data)

class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for changing password"""
    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(
        required=True,
        write_only=True,
        validators=[validate_password]
    )
    confirm_new_password = serializers.CharField(
        required=True,
        write_only=True
    )
    
    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_new_password']:
            raise serializers.ValidationError({
                "confirm_new_password": "New passwords don't match."
            })
        return attrs
    
    def validate_old_password(self, value):
        request = self.context.get('request')
        if not request.user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect.")
        return value

class LoginSerializer(serializers.Serializer):
    """Serializer for user login"""
    username = serializers.CharField(required=True)
    password = serializers.CharField(required=True, write_only=True)
    
    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')
        
        if username and password:
            user = authenticate(request=self.context.get('request'), 
                              username=username, password=password)
            if not user:
                raise serializers.ValidationError(
                    "Unable to log in with provided credentials."
                )
            if not user.is_active:
                raise serializers.ValidationError(
                    "User account is disabled."
                )
        else:
            raise serializers.ValidationError(
                "Must include 'username' and 'password'."
            )
        
        attrs['user'] = user
        return attrs