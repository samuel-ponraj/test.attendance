'use client'

import React, { useEffect, useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ArrowLeft, Edit, Loader2, Upload } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { db, storage } from '@/lib/firebase'
import {
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
  query,
  collection,
  where,
  orderBy,
  onSnapshot
} from 'firebase/firestore'
import {
  getDownloadURL,
  ref,
  uploadBytes,
} from 'firebase/storage'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import BillingCard from './BillingCard'
import PaymentHistoryCard from './PaymentHistoryCard'
import SalaryCard from "./SalaryCard";

const MemberProfile = ({ teamId, memberId }) => {
  const router = useRouter()
  

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [contact, setContact] = useState('')
  const [role, setRole] = useState('member')
  const [photoURL, setPhotoURL] = useState('')

  const [photoPreview, setPhotoPreview] = useState('')
  const [photoFile, setPhotoFile] = useState(null)

  const [forms, setForms] = useState([])
  const [dynamicFields, setDynamicFields] = useState({})

  const [memberBilling, setMemberBilling] = useState({})
  const [teamBillingConfig, setTeamBillingConfig] = useState({})
  const [payments, setPayments] = useState([])

  useEffect(() => {
    const fetchMember = async () => {
      try {
        setLoading(true)

        const memberRef = doc(db, 'teams', teamId, 'members', memberId)
        const memberSnap = await getDoc(memberRef)

        if (!memberSnap.exists()) {
          toast.error('Member not found')
          router.back()
          return
        }

        const data = memberSnap.data()

        setFirstName(data.firstName || '')
        setLastName(data.lastName || '')
        setEmail(data.email || '')
        setContact(data.contact || '')
        setRole(data.role || 'member')
        setPhotoURL(data.photoURL || '')
        setPhotoPreview(data.photoURL || '')
        setDynamicFields(data.customData || {})
        setMemberBilling(data.billing || {});
      } catch (error) {
        console.error(error)
        toast.error('Failed to load member details')
      } finally {
        setLoading(false)
      }
    }

    if (teamId && memberId) {
      fetchMember()
      fetchCustomForms()
    }
  }, [teamId, memberId, router])

  useEffect(() => {
	if (!teamId) return;

	const paymentsRef = collection(db, "teams", teamId , "payments");
	const q = query(paymentsRef, orderBy("createdAt", "desc"));

	const unsubscribe = onSnapshot(q, (snap) => {
		const list = snap.docs.map((doc) => ({
			id: doc.id,
			...doc.data(),
		}));

		setPayments(list);
	});

	return () => unsubscribe();
}, [teamId]);

//  Fetch Custom Forms

  const fetchCustomForms = async () => {
  try {
    if (!teamId) return

    const teamSnap = await getDoc(doc(db, 'teams', teamId))
    setTeamBillingConfig(teamSnap.data()?.billingConfig || {});
    if (!teamSnap.exists()) return

    const formIds = teamSnap.data().customForms || []
    if (!formIds.length) return

    const formPromises = formIds.map((id) =>
      getDoc(doc(db, 'customForms', id))
    )

    const formSnaps = await Promise.all(formPromises)

    const formsData = formSnaps
      .filter((snap) => snap.exists())
      .map((snap) => ({
        id: snap.id,
        title: snap.data().title || "Custom Form",
        fields: snap.data().customFields || [],
      }))

    setForms(formsData)
  } catch (err) {
    console.error(err)
    toast.error('Failed to load custom forms')
  }
}


const handleDynamicChange = (fieldId, value) => {
  setDynamicFields((prev) => ({
    ...prev,
    [fieldId]: value,
  }))
}

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0]

    if (!file) return

    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const handleImageUpload = async (file) => {
  try {
    setSaving(true)

    const previewUrl = URL.createObjectURL(file)
    setPhotoPreview(previewUrl)

    const fileRef = ref(
      storage,
      `members/${teamId}/${memberId}/profile-photo-${Date.now()}`
    )

    await uploadBytes(fileRef, file)
    const uploadedPhotoURL = await getDownloadURL(fileRef)

    const memberRef = doc(db, 'teams', teamId, 'members', memberId)

    await updateDoc(memberRef, {
      photoURL: uploadedPhotoURL,
      updatedAt: serverTimestamp(),
    })

    setPhotoURL(uploadedPhotoURL)
    setPhotoPreview(uploadedPhotoURL)

    toast.success('Profile photo updated successfully')
  } catch (error) {
    console.error(error)
    toast.error('Failed to upload profile photo')
  } finally {
    setSaving(false)
  }
}

  const handleSave = async () => {
  try {
    setSaving(true)

    const memberRef = doc(db, 'teams', teamId, 'members', memberId)

    await updateDoc(memberRef, {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      contact: contact.trim(),
      customData: dynamicFields,
      updatedAt: serverTimestamp(),
    })

    toast.success('Member profile updated successfully')
  } catch (error) {
    console.error(error)
    toast.error('Failed to save member profile')
  } finally {
    setSaving(false)
  }
}


  if (loading) {
    return (
      <div className='flex min-h-[400px] items-center justify-center'>
        <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
      </div>
    )
  }

  return (
    <div className='space-y-4 px-4 md:px-6'>
      <div className='flex items-center justify-between'>
        <button
          onClick={() => router.back()}
          className='flex items-center gap-2 text-muted-foreground hover:text-foreground'
        >
          <ArrowLeft className='h-4 w-4' />
          Back
        </button>

        <div className='flex items-center gap-2'>
          <Button
            onClick={handleSave}
            disabled={saving}
            className='min-w-40'
          >
            {saving ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              </>
            ) : (
              'Save Profile'
            )}
          </Button>
        </div>
      </div>

      <Card className='rounded-2xl border shadow-sm'>
        <CardHeader>
          <CardTitle className='text-lg'>Basic Details</CardTitle>
        </CardHeader>

        <CardContent className='p-2'>
          <div className='flex flex-col gap-4 lg:flex-row'>
            <div className="flex w-full flex-col items-center lg:w-64">
                <div className="relative">
                  <Avatar className="h-36 w-36 border-4 border-primary shadow-sm">
                    <AvatarImage src={photoPreview} />
                    <AvatarFallback className="text-2xl">
                      {firstName?.[0]}
                      {lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>

                  <Label
                    htmlFor="photo-upload"
                    className="absolute bottom-1 right-1 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition hover:scale-105"
                  >
                    <Edit className="h-4 w-4" />
                  </Label>

                  <Input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (!file) return

                      setPhotoFile(file)
                      handleImageUpload(file)
                    }}
                  />
                  </div>
            </div>

            <div className='flex-1 space-y-5'>
              <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                <div className='space-y-2'>
                  <Label>First Name</Label>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>

                <div className='space-y-2'>
                  <Label>Last Name</Label>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>

              <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
              <div className='space-y-2'>
                <Label>Email</Label>
                <Input type='email' value={email} disabled />
              </div>

              <div className='space-y-2'>
                <Label>Contact</Label>
                <Input
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                />
              </div>
              </div>

              <div className='space-y-2'>
                <Label>Role</Label>
                <Input value={role} disabled />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {teamBillingConfig?.billingType === "salary" ? (
            <SalaryCard
              teamId={teamId}
	            memberId={memberId}
            />
          ) : (
            <BillingCard
              teamId={teamId}
              memberId={memberId}
              config={teamBillingConfig}
            />
          )}

      {/* Custom Forms */}

      {forms.map((form) => (
          <Card key={form.id} className="rounded-2xl border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">{form.title}</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {form.fields.map((field) => (
                <div key={field.id} className="pb-1">
                  <Label className="pb-2" htmlFor={field.id}>
                    {field.name} {field.required && "*"}
                  </Label>

                  {field.type === "textarea" ? (
                    <Textarea
                      id={field.id}
                      value={dynamicFields[field.id] || ""}
                      onChange={(e) =>
                        handleDynamicChange(field.id, e.target.value)
                      }
                      required={field.required}
                    />
                  ) : field.type === "select" ? (
                    <Select
                      value={dynamicFields[field.id] || ""}
                      onValueChange={(val) =>
                        handleDynamicChange(field.id, val)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={`Select ${field.name.toLowerCase()}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options?.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : field.type === "radio" ? (
                    <RadioGroup
                      value={dynamicFields[field.id] || ""}
                      onValueChange={(val) =>
                        handleDynamicChange(field.id, val)
                      }
                      className="flex flex-row flex-wrap gap-4 pt-1"
                    >
                      {field.options?.map((opt) => (
                        <div key={opt} className="flex items-center space-x-2">
                          <RadioGroupItem value={opt} id={`${field.id}-${opt}`} />
                          <Label
                            htmlFor={`${field.id}-${opt}`}
                            className="font-normal cursor-pointer"
                          >
                            {opt}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  ) : (
                    <Input
                      id={field.id}
                      type={field.type}
                      value={dynamicFields[field.id] || ""}
                      onChange={(e) =>
                        handleDynamicChange(field.id, e.target.value)
                      }
                      required={field.required}
                    />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
          ))} 
          {teamBillingConfig?.billingType !== "salary" ? (
          <PaymentHistoryCard payments={payments}/>) : null}
    </div>
  )
}

export default MemberProfile
