'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { fetchTenants } from "@/services/tenantService";
import { Tenant } from "@/types/tenant";

// Define form validation schema
const schema = yup.object({
  tenant_id: yup.string().required('Organization is required'),
  firstName: yup.string().required('First name is required'),
  middleName: yup.string().default('').notRequired(),
  lastName: yup.string().required('Last name is required'),
  mobileNo: yup.string()
    .matches(/^[0-9]{10}$/, 'Mobile number must be 10 digits')
    .required('Mobile number is required'),
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string()
    .min(8, 'Password must be at least 8 characters')
    .required('Password is required'),
  confirmPassword: yup.string()
    .oneOf([yup.ref('password')], 'Passwords must match')
    .required('Please confirm your password'),
  gender: yup.string().required('Gender is required'),
  maritalStatus: yup.string().required('Marital status is required'),
  address: yup.string().required('Address is required'),
  state: yup.string().required('State is required'),
  district: yup.string().required('District is required'),
  mandal: yup.string().required('Mandal is required'),
  course: yup.string().required('Course is required'),
  schoolCorrespondentName: yup.string().required('School correspondent name is required'),
  schoolCorrespondentPhone: yup.string()
    .matches(/^[0-9]{10}$/, 'Phone number must be 10 digits')
    .required('School correspondent phone is required'),
  schoolCorrespondentEmail: yup.string()
    .email('Invalid email')
    .required('School correspondent email is required'),
}).required();

// Define FormData type from the schema
type FormData = yup.InferType<typeof schema>;

interface LocationData {
  states: string[];
  districts: string[];
  mandals: string[];
}

const RegisterForm: React.FC = () => {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [locationData, setLocationData] = useState<LocationData>({
    states: [],
    districts: [],
    mandals: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<FormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      course: 'Award Nomination',
      gender: '',
      maritalStatus: '',
      state: '',
      district: '',
      mandal: ''
    }
  });

  // Load tenants and initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        const [tenantsData, statesData] = await Promise.all([
          fetchTenants(),
          fetch('/api/locations/states').then(res => res.json())
        ]);

        setTenants(tenantsData);
        
        if (statesData.success) {
          setLocationData(prev => ({
            ...prev,
            states: statesData.data
          }));
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

  // Handle state change to load districts
  const handleStateChange = async (state: string) => {
    setValue('district', '');
    setValue('mandal', '');
    setLocationData(prev => ({ ...prev, districts: [], mandals: [] }));

    try {
      const response = await fetch(`/api/locations/districts?state=${encodeURIComponent(state)}`);
      const data = await response.json();
      
      if (data.success) {
        setLocationData(prev => ({
          ...prev,
          districts: data.data
        }));
      }
    } catch (err) {
      console.error('Error loading districts:', err);
      setError('Failed to load districts. Please try again.');
    }
  };

  // Handle district change to load mandals
  const handleDistrictChange = async (district: string) => {
    setValue('mandal', '');
    setLocationData(prev => ({ ...prev, mandals: [] }));

    if (!district) return;

    try {
      const response = await fetch(`/api/locations/mandals?district=${encodeURIComponent(district)}`);
      const data = await response.json();
      
      if (data.success) {
        setLocationData(prev => ({
          ...prev,
          mandals: data.data
        }));
      }
    } catch (err) {
      console.error('Error loading mandals:', err);
      setError('Failed to load mandals. Please try again.');
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || 'Registration failed');
      }

      router.push('/login?registered=true');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Watch state and district for cascading dropdowns
  const selectedState = watch('state');
  const selectedDistrict = watch('district');

  // Update districts when state changes
  useEffect(() => {
    if (selectedState) {
      handleStateChange(selectedState);
    }
  }, [selectedState]);

  // Update mandals when district changes
  useEffect(() => {
    if (selectedDistrict) {
      handleDistrictChange(selectedDistrict);
    }
  }, [selectedDistrict]);

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
          
          <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6 p-6">
            {/* Organization Selection */}
            <div className="space-y-6 bg-gray-50 p-6 rounded-lg border border-gray-100">
              <div className="flex items-center">
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-indigo-100 text-indigo-600 mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 1h6v2H7V5zm0 4h6v2H7V9zm0 4h6v2H7v-2z" clipRule="evenodd" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-800">
                  Organization
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <div className="sm:col-span-6">
                  <label className="block text-sm font-medium text-gray-700">
                    Organization
                  </label>
                  <select
                    {...register("tenant_id")}
                    className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                    disabled={isLoading}
                  >
                    <option value="">Select Organization</option>
                    {tenants.map((t) => (
                      <option key={t.tenant_id || t.id} value={t.tenant_id || t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  {errors.tenant_id && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.tenant_id.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Personal Details Section */}
            <div className="space-y-6 bg-gray-50 p-6 rounded-lg border border-gray-100">
              {/* ... rest of the code remains the same ... */}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterForm;
