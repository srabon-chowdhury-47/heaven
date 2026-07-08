import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import axiosInstance from "../../../api/axios";
import { FiArrowLeft, FiSave, FiEdit3, FiUserPlus } from "react-icons/fi";

export default function AddEmployee() {
  const navigate = useNavigate();
  const location = useLocation();

  const editData = location.state?.editData;
  const isEditMode = Boolean(editData);

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});

  const [formData, setFormData] = useState({
    joining_date: "",
    full_name: "",
    father_name: "",
    mother_name: "",
    gender: "M",
    blood_group: "",
    dob: "",
    age: "",
    religion: "",
    birth_id_no: "",
    nid_no: "",
    passport_no: "",
    nationality: "Bangladeshi",
    email: "",
    mobile1: "",
    mobile2: "",
    mobile_father: "",
    mobile_mother: "",
    mobile_others: "",
    acc_name: "",
    acc_no: "",
    bank_name: "",
    branch_name: "",
    bkash_no: "",
    nagad_no: "",
    rocket_no: "",
  });

  const [picture, setPicture] = useState(null);

  useEffect(() => {
    if (isEditMode) {
      const prepopulatedData = { ...editData };
      Object.keys(prepopulatedData).forEach((key) => {
        if (prepopulatedData[key] === null) prepopulatedData[key] = "";
      });
      setFormData(prepopulatedData);
    }
  }, [isEditMode, editData]);

  // Calculate age from date of birth
  const calculateAge = (dob) => {
    if (!dob) return "";
    
    const birthDate = new Date(dob);
    const today = new Date();
    
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age.toString();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // If the field is dob, calculate age automatically
    if (name === "dob") {
      const calculatedAge = calculateAge(value);
      setFormData({ 
        ...formData, 
        [name]: value,
        age: calculatedAge 
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
    
    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors({ ...fieldErrors, [name]: "" });
    }
  };

  const handleFileChange = (e) => {
    setPicture(e.target.files[0]);
  };

  // Client-side validation
  const validateForm = () => {
    const newErrors = {};
    
    // Email validation
    if (!formData.email) {
      newErrors.email = "Email address is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // Check other required fields
    const requiredFields = [
      { field: "full_name", label: "Full Name" },
      { field: "joining_date", label: "Joining Date" },
      { field: "father_name", label: "Father's Name" },
      { field: "mother_name", label: "Mother's Name" },
      { field: "dob", label: "Date of Birth" },
      { field: "religion", label: "Religion" },
      { field: "nid_no", label: "NID No" },
      { field: "mobile1", label: "Primary Mobile" },
    ];

    requiredFields.forEach(({ field, label }) => {
      if (!formData[field]) {
        newErrors[field] = `${label} is required`;
      }
    });

    // Validate age is calculated
    if (!formData.age || parseInt(formData.age) < 0) {
      newErrors.dob = "Please select a valid date of birth";
    }

    setFieldErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Run client-side validation
    if (!validateForm()) {
      // Scroll to the first error
      const firstErrorField = Object.keys(fieldErrors)[0];
      if (firstErrorField) {
        const element = document.getElementsByName(firstErrorField)[0];
        if (element) {
          element.focus();
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
      return;
    }

    setLoading(true);
    setErrors([]);

    const submitData = new FormData();
    for (const key in formData) {
      if (
        key !== "id" &&
        key !== "employee_id" &&
        key !== "picture" &&
        key !== "education" &&
        key !== "previous_work"
      ) {
        submitData.append(key, formData[key]);
      }
    }

    if (picture) {
      submitData.append("picture", picture);
    }

    try {
      if (isEditMode) {
        await axiosInstance.patch(`person/employees/${editData.id}/`, submitData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        alert("Employee successfully updated!");
      } else {
        await axiosInstance.post("person/employees/", submitData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        alert("Employee successfully added!");
      }
      navigate("/dashboard/employees");
    } catch (err) {
      console.log("DJANGO ERROR:", err.response?.data);

      const errorResponse = err.response?.data;

      if (errorResponse && typeof errorResponse === "object" && !Array.isArray(errorResponse)) {
        // Handle field-specific errors from Django
        const extractedErrors = [];
        const fieldErrorMap = {};
        
        Object.entries(errorResponse).forEach(([field, messages]) => {
          const cleanFieldName = field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, " ");
          const cleanMessage = Array.isArray(messages) ? messages.join(" ") : messages;
          extractedErrors.push(`${cleanFieldName}: ${cleanMessage}`);
          
          // Store field-specific errors
          if (typeof cleanMessage === "string") {
            fieldErrorMap[field] = cleanMessage;
          }
        });
        
        setErrors(extractedErrors);
        setFieldErrors(fieldErrorMap);
        
        // Focus on first field with error
        const firstErrorField = Object.keys(fieldErrorMap)[0];
        if (firstErrorField) {
          const element = document.getElementsByName(firstErrorField)[0];
          if (element) {
            element.focus();
            element.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }
      } else {
        setErrors([
          `Failed to ${isEditMode ? "update" : "add"} employee. Please check your connection or try again.`,
        ]);
      }

      setLoading(false);
    }
  };

  // Helper function to render field with error
  const renderField = (label, name, type = "text", required = false, placeholder = "", readOnly = false) => {
    const hasError = fieldErrors[name];
    
    return (
      <div>
        <label className="block text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-0.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <input
          type={type}
          name={name}
          required={required}
          placeholder={placeholder}
          value={formData[name]}
          onChange={handleChange}
          readOnly={readOnly}
          className={`w-full bg-white border ${
            hasError ? "border-red-500" : "border-gray-300"
          } rounded p-1.5 text-sm focus:ring-1 focus:ring-blue-500 outline-none ${
            readOnly ? "bg-gray-100 cursor-not-allowed" : ""
          }`}
        />
        {hasError && (
          <p className="text-red-500 text-xs mt-0.5">{fieldErrors[name]}</p>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-3 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold flex items-center gap-2">
            {isEditMode ? (
              <FiEdit3 className="text-blue-600" />
            ) : (
              <FiUserPlus className="text-blue-600" />
            )}
            {isEditMode ? "Edit Employee" : "Add New Employee"}
          </h1>
          {isEditMode && editData && (
            <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full font-semibold">
              {editData.employee_id}
            </span>
          )}
        </div>
        <Link
          to="/dashboard/employees"
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded text-sm font-semibold transition flex items-center gap-1.5 border border-gray-300"
        >
          <FiArrowLeft /> Cancel
        </Link>
      </div>

      {/* Error Banner */}
      {errors.length > 0 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded flex items-start gap-2">
          <div className="shrink-0 mt-0.5">⚠️</div>
          <div>
            <p className="font-bold mb-1">Please fix the following errors:</p>
            <ul className="list-disc ml-4 space-y-0.5">
              {errors.map((errMsg, index) => (
                <li key={index}>{errMsg}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Row 1: Core Identity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-300 lg:col-span-1">
            <h2 className="text-sm font-bold text-gray-700 border-b pb-2 mb-3">Core Identity</h2>
            <div className="space-y-3">
              {renderField("Full Name", "full_name", "text", true)}
              {renderField("Joining Date", "joining_date", "date", true)}
              <div>
                <label className="block text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-0.5">
                  Profile Picture
                </label>
                <input
                  type="file"
                  name="picture"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full bg-white border border-gray-300 rounded p-1 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-0.5">
                    Gender *
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full bg-white border border-gray-300 rounded p-1.5 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                  >
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="O">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-0.5">
                    Blood Group
                  </label>
                  <input
                    type="text"
                    name="blood_group"
                    placeholder="e.g., O+"
                    value={formData.blood_group}
                    onChange={handleChange}
                    className="w-full bg-white border border-gray-300 rounded p-1.5 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-300 lg:col-span-2">
            <h2 className="text-sm font-bold text-gray-700 border-b pb-2 mb-3">Personal & Family Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {renderField("Father's Name", "father_name", "text", true)}
              {renderField("Mother's Name", "mother_name", "text", true)}
              {renderField("Date of Birth", "dob", "date", true)}
              {renderField("Age", "age", "number", true, "", true)} {/* Age is read-only */}
              {renderField("Religion", "religion", "text", true)}
              <div>
                <label className="block text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-0.5">
                  Nationality
                </label>
                <input
                  type="text"
                  name="nationality"
                  value={formData.nationality}
                  onChange={handleChange}
                  className="w-full bg-white border border-gray-300 rounded p-1.5 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Identification & Contact */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-300">
            <h2 className="text-sm font-bold text-gray-700 border-b pb-2 mb-3">Identification & Contact</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {renderField("NID No", "nid_no", "text", true)}
              {renderField("Birth ID No", "birth_id_no")}
              {renderField("Primary Mobile", "mobile1", "text", true)}
              {renderField("Email Address", "email", "email", true)}
              {renderField("Father's Mobile", "mobile_father")}
              {renderField("Mother's Mobile", "mobile_mother")}
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-300">
            <h2 className="text-sm font-bold text-gray-700 border-b pb-2 mb-3">Financial Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">Standard Bank</p>
              </div>
              {renderField("Bank Name", "bank_name")}
              {renderField("Branch Name", "branch_name")}
              {renderField("Account Name", "acc_name")}
              {renderField("Account No", "acc_no")}

              <div className="md:col-span-2 mt-1">
                <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider mb-1">Mobile Banking</p>
              </div>
              {renderField("bKash Number", "bkash_no")}
              {renderField("Nagad Number", "nagad_no")}
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className={`px-6 py-1.5 rounded text-sm font-bold text-white transition flex items-center gap-1.5 ${
              loading
                ? "bg-blue-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 border border-blue-700"
            }`}
          >
            <FiSave />
            {loading
              ? isEditMode
                ? "Updating..."
                : "Saving..."
              : isEditMode
              ? "Update Employee"
              : "Save Employee"}
          </button>
        </div>
      </form>
    </div>
  );
}