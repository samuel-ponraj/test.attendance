'use client'
import { useState } from "react"
import CreateForm from "../../../../components/admin/forms/customForms/CreateForm"

export default function Page() {

    const [fields, setFields] = useState([])
  return (
    
    <div className="flex flex-col gap-4">
      <CreateForm fields={fields} onChange={setFields}/>
    </div>
  )
}
