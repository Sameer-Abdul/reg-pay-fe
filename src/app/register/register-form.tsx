'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Formik, Form, FormikHelpers, useField } from 'formik';
import * as Yup from 'yup';
import { Tenant, fetchTenants } from '@/services/tenantService';

interface RegistrationFormValues {
  tenantId: string;
  firstName: string;
  middleName: string;
  lastName: string;
  mobileNo: string;
  email: string;
  password: string;
  confirmPassword: string;
  gender: string;
  maritalStatus: string;
  address: string;
  state: string;
  district: string;
  mandal: string;
  course: string;
  schoolCorrespondentName: string;
  schoolCorrespondentPhone: string;
  schoolCorrespondentEmail: string;
}

interface FormFieldProps {
  label: string;
  name: string;
  type?: string;
  as?: 'input' | 'select' | 'textarea';
  options?: string[];
  disabled?: boolean;
  min?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  className?: string;
  children?: React.ReactNode;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  type = 'text',
  as = 'input',
  options = [],
  disabled = false,
  min,
  onChange,
  className = '',
  children,
}) => {
  const [field, meta] = useField(name);
  
  const baseClasses = "mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition duration-200 sm:text-sm p-3 border";
  
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (onChange) {
      onChange(e);
    }
    field.onChange(e);
  };

  const inputProps = {
    ...field,
    id: name,
    className: `${baseClasses} ${meta.touched && meta.error ? 'border-red-500' : ''}`,
    disabled: disabled,
    min: min,
    type: type
  };
  
  return (
    <div className={className}>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label} {!children && ['select', 'input', 'textarea'].includes(as) && '*'}
      </label>
      
      <div className="mt-1">
        {as === 'input' && <input {...inputProps} />}
        
        {as === 'select' && (
          <select {...inputProps} onChange={handleChange}>
            {children || (
              <>
                <option value="">Select {label}</option>
                {options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </>
            )}
          </select>
        )}
        
        {as === 'textarea' && (
          <textarea {...inputProps} rows={3} className={`${baseClasses} h-24`} />
        )}
      </div>
      
      {meta.touched && meta.error && (
        <p className="mt-1 text-sm text-red-600">{meta.error}</p>
      )}
    </div>
  );
};

const RegisterForm: React.FC = () => {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [mandals, setMandals] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const initialValues: RegistrationFormValues = {
    tenantId: '',
    firstName: '',
    middleName: '',
    lastName: '',
    mobileNo: '',
    email: '',
    password: '',
    confirmPassword: '',
    maritalStatus: '',
    address: '',
    gender: '',
    course: 'Award Nomination',
    state: '',
    district: '',
    mandal: '',
    schoolCorrespondentName: '',
    schoolCorrespondentPhone: '',
    schoolCorrespondentEmail: '',
  };

  const validationSchema = Yup.object().shape({
    tenantId: Yup.string().required('Please select a tenant'),
    firstName: Yup.string().required('First name is required'),
    middleName: Yup.string(),
    lastName: Yup.string().required('Last name is required'),
    mobileNo: Yup.string()
      .matches(/^[0-9]{10}$/, 'Mobile number must be 10 digits')
      .required('Mobile number is required'),
    email: Yup.string().email('Invalid email').required('Email is required'),
    password: Yup.string()
      .min(8, 'Password must be at least 8 characters')
      .required('Password is required'),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('password')], 'Passwords must match')
      .required('Please confirm your password'),
    maritalStatus: Yup.string().required('Marital status is required'),
    address: Yup.string().required('Address is required'),
    gender: Yup.string().required('Gender is required'),
    course: Yup.string().required('Course is required'),
    state: Yup.string().required('State is required'),
    district: Yup.string().required('District is required'),
    mandal: Yup.string().required('Mandal is required'),
    schoolCorrespondentName: Yup.string().required('School correspondent name is required'),
    schoolCorrespondentPhone: Yup.string()
      .matches(/^[0-9]{10}$/, 'Phone number must be 10 digits')
      .required('School correspondent phone is required'),
    schoolCorrespondentEmail: Yup.string()
      .email('Invalid email')
      .required('School correspondent email is required'),
  });

  const handleSubmit = async (
    values: RegistrationFormValues,
    { setSubmitting }: FormikHelpers<RegistrationFormValues>
  ) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      router.push('/login?registered=true');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsLoading(false);
      setSubmitting(false);
    }
  };

  const loadDistricts = async (state: string) => {
    try {
      const response = await fetch(`/api/locations/districts?state=${encodeURIComponent(state)}`);
      const data = await response.json();
      
      if (data.success) {
        setDistricts(data.data);
      }
    } catch (err) {
      console.error('Error loading districts:', err);
    }
  };

  const loadMandals = async (district: string) => {
    try {
      const response = await fetch(`/api/locations/mandals?district=${encodeURIComponent(district)}`);
      const data = await response.json();
      
      if (data.success) {
        setMandals(data.data);
      }
    } catch (err) {
      console.error('Error loading mandals:', err);
    }
  };

  const handleStateChange = async (
    e: React.ChangeEvent<HTMLSelectElement>,
    setFieldValue: (field: string, value: any) => void
  ) => {
    const state = e.target.value;
    setFieldValue('state', state);
    setFieldValue('district', '');
    setFieldValue('mandal', '');
    setDistricts([]);
    setMandals([]);
    
    if (state) {
      await loadDistricts(state);
    }
  };

  const handleDistrictChange = async (
    e: React.ChangeEvent<HTMLSelectElement>,
    setFieldValue: (field: string, value: any) => void
  ) => {
    const district = e.target.value;
    setFieldValue('district', district);
    setFieldValue('mandal', '');
    setMandals([]);
    
    if (district) {
      await loadMandals(district);
    }
  };

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        const [tenantsRes, statesRes] = await Promise.all([
          fetchTenants(),
          fetch('/api/locations/states').then(res => res.json())
        ]);
        
        setTenants(tenantsRes);
        
        if (statesRes.success) {
          setStates(statesRes.data);
        }
      } catch (err) {
        console.error('Error loading initial data:', err);
        setError('Failed to load initial data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              Registration Form
            </h3>
          </div>
          
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4">
              <div className="flex">
                <div className="shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {({ isSubmitting, setFieldValue, values }) => (
              <Form className="space-y-6 p-6">
                {/* Organization Selection */}
                <div className="space-y-6 bg-gray-50 p-6 rounded-lg border border-gray-100">
                  <div className="flex items-center">
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-indigo-100 text-indigo-600 mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 1h6v2H7V5zm0 4h6v2H7V9zm0 4h6v2H7v-2z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-800">Organization</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                    <div className="sm:col-span-6">
                      <FormField
                        label="Organization"
                        name="tenantId"
                        as="select"
                        className="sm:col-span-6"
                      >
                        <option value="">Select Organization</option>
                        {tenants.map((tenant) => (
                          <option key={tenant.tenant_id} value={tenant.tenant_id}>
                            {tenant.name}
                          </option>
                        ))}
                      </FormField>
                    </div>
                  </div>
                </div>

                {/* Personal Details Section */}
                <div className="space-y-6 bg-gray-50 p-6 rounded-lg border border-gray-100">
                  <div className="flex items-center">
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-indigo-100 text-indigo-600 mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-800">Personal Details</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      label="First Name"
                      name="firstName"
                      type="text"
                      className="col-span-1"
                    />
                    
                    <FormField
                      label="Middle Name"
                      name="middleName"
                      type="text"
                      className="col-span-1"
                    />
                    
                    <FormField
                      label="Last Name"
                      name="lastName"
                      type="text"
                      className="col-span-1"
                    />
                    
                    <FormField
                      label="Mobile Number"
                      name="mobileNo"
                      type="tel"
                      className="col-span-1"
                    />
                    
                    <FormField
                      label="Email"
                      name="email"
                      type="email"
                      className="col-span-1"
                    />
                    
                    <FormField
                      label="Password"
                      name="password"
                      type="password"
                      className="col-span-1"
                    />
                    
                    <FormField
                      label="Confirm Password"
                      name="confirmPassword"
                      type="password"
                      className="col-span-1"
                    />
                    
                    <FormField
                      label="Gender"
                      name="gender"
                      as="select"
                      className="col-span-1"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </FormField>
                    
                    <FormField
                      label="Marital Status"
                      name="maritalStatus"
                      as="select"
                      className="col-span-1"
                    >
                      <option value="">Select Marital Status</option>
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Divorced">Divorced</option>
                      <option value="Widowed">Widowed</option>
                    </FormField>
                    
                    <FormField
                      label="Address"
                      name="address"
                      as="textarea"
                      className="col-span-2"
                    />
                    
                    <FormField
                      label="State"
                      name="state"
                      as="select"
                      onChange={(e) => handleStateChange(e, setFieldValue)}
                      disabled={isLoading}
                      options={states}
                      className="col-span-1"
                    />
                    
                    <FormField
                      label="District"
                      name="district"
                      as="select"
                      onChange={(e) => handleDistrictChange(e, setFieldValue)}
                      disabled={!values.state || isLoading}
                      options={districts}
                      className="col-span-1"
                    />
                    
                    <FormField
                      label="Mandal"
                      name="mandal"
                      as="select"
                      disabled={!values.district || isLoading}
                      options={mandals}
                      className="col-span-1"
                    />
                  </div>
                </div>
                
                {/* School Correspondent Information */}
                <div className="space-y-6 bg-gray-50 p-6 rounded-lg border border-gray-100">
                  <div className="flex items-center">
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-indigo-100 text-indigo-600 mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-800">School Correspondent Information</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      label="Correspondent Name"
                      name="schoolCorrespondentName"
                      type="text"
                      className="col-span-1"
                    />
                    
                    <FormField
                      label="Correspondent Phone"
                      name="schoolCorrespondentPhone"
                      type="tel"
                      className="col-span-1"
                    />
                    
                    <FormField
                      label="Correspondent Email"
                      name="schoolCorrespondentEmail"
                      type="email"
                      className="col-span-1"
                    />
                  </div>
                </div>
                
                {/* Submit Button */}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || isLoading}
                    className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${(isSubmitting || isLoading) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isSubmitting || isLoading ? 'Registering...' : 'Register'}
                  </button>
                </div>
              </Form>
            )}
          </Formik>
        </div>
      </div>
    </div>
  );
};

export default RegisterForm;
