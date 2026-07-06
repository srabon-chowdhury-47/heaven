from django.db import models
import uuid

# ==========================================
# 1. EMPLOYEE MODELS
# ==========================================

class Employee(models.Model):
    # Personal Details
    employee_id = models.CharField(max_length=20, unique=True, editable=False)
    joining_date = models.DateField()
    picture = models.ImageField(upload_to='employee_pics/', blank=True, null=True)
    full_name = models.CharField(max_length=200)
    father_name = models.CharField(max_length=200)
    mother_name = models.CharField(max_length=200)
    
    GENDER_CHOICES = [('M', 'Male'), ('F', 'Female'), ('O', 'Other')]
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES)
    blood_group = models.CharField(max_length=5, blank=True)
    dob = models.DateField(verbose_name="Date of Birth")
    age = models.IntegerField()
    religion = models.CharField(max_length=50)

    # Identification
    birth_id_no = models.CharField(max_length=50, blank=True)
    nid_no = models.CharField(max_length=50, unique=True)
    passport_no = models.CharField(max_length=50, blank=True)
    nationality = models.CharField(max_length=50, default="Bangladeshi")

    # Contact Information
    email = models.EmailField(unique=True, blank=True, null=True)
    mobile1 = models.CharField(max_length=15, unique=True)
    mobile2 = models.CharField(max_length=15, blank=True)
    mobile_father = models.CharField(max_length=15, blank=True)
    mobile_mother = models.CharField(max_length=15, blank=True)
    mobile_others = models.CharField(max_length=15, blank=True)

    # Bank Details
    acc_name = models.CharField(max_length=100, blank=True)
    acc_no = models.CharField(max_length=50, blank=True)
    bank_name = models.CharField(max_length=100, blank=True)
    branch_name = models.CharField(max_length=100, blank=True)

    # Mobile Banking
    bkash_no = models.CharField(max_length=15, blank=True)
    nagad_no = models.CharField(max_length=15, blank=True)
    rocket_no = models.CharField(max_length=15, blank=True)

    # Financial Details
    balance = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)

    def save(self, *args, **kwargs):
        if not self.employee_id:
            self.employee_id = f"EMP-{uuid.uuid4().hex[:6].upper()}"
        super(Employee, self).save(*args, **kwargs)

    def __str__(self):
        return f"{self.employee_id} - {self.full_name}"

class Education(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='education')
    exam_name = models.CharField(max_length=100)
    institute_name = models.CharField(max_length=200)
    passing_year = models.IntegerField()
    group = models.CharField(max_length=100)
    gpa = models.CharField(max_length=10)
    board_university = models.CharField(max_length=100)

class PreviousWork(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='previous_work')
    work_name = models.CharField(max_length=100)
    shop_name = models.CharField(max_length=200)
    address = models.TextField()

# ==========================================
# 2. CUSTOMER MODEL
# ==========================================

class Customer(models.Model):
    # --- Personal Details ---
    customer_id = models.CharField(max_length=20, unique=True, editable=False)
    shop_name = models.CharField(max_length=200, blank=True, help_text="Leave blank if retail customer")
    proprietor_name = models.CharField(max_length=200)
    employee_name = models.CharField(max_length=200, blank=True, help_text="Employee acting for the shop/buyer")
    age = models.IntegerField(blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    mobile1 = models.CharField(max_length=15, unique=True)
    mobile2 = models.CharField(max_length=15, blank=True)
    nid = models.CharField(max_length=50, blank=True)
    picture = models.ImageField(upload_to='customer_pics/', blank=True, null=True)

    # --- Address ---
    country = models.CharField(max_length=50, default="Bangladesh")
    division = models.CharField(max_length=50)
    district = models.CharField(max_length=50)
    police_station = models.CharField(max_length=100, blank=True)
    post_office = models.CharField(max_length=50, blank=True)
    town_village = models.CharField(max_length=100)
    market_name = models.CharField(max_length=200, blank=True)

    # --- Business Info ---
    TYPE_CHOICES = [
        ('Retail', 'Retail'),
        ('Wholesale', 'Wholesale')
    ]
    customer_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='Retail')
    referred_by = models.CharField(max_length=100, blank=True)
    note_remarks = models.TextField(blank=True)

    # --- Financial Details ---
    balance = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)

    # --- Meta Data ---
    entry_by = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, blank=True, help_text="Select the employee who added this record")
    entry_date_time = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.customer_id:
            self.customer_id = f"CUST-{uuid.uuid4().hex[:6].upper()}"
        super(Customer, self).save(*args, **kwargs)

    def __str__(self):
        name_to_display = self.shop_name if self.shop_name else self.proprietor_name
        return f"{self.customer_id} - {name_to_display} ({self.customer_type})"