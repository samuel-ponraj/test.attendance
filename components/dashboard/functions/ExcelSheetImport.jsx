"use client";

import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, CheckCircle2, Loader2, Info } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from '../../../app/context/AuthContext'

// Firebase Imports
import { db } from "@/lib/firebase"; 
import { collection, writeBatch, doc, serverTimestamp, increment } from "firebase/firestore";

export default function ImportExcelSheet({ open, onOpenChange, team, onSuccess }) {
  const [file, setFile] = useState(null);
  const [valid, setValid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [excelData, setExcelData] = useState([]);
  const fileInputRef = useRef(null);
  const { user } = useAuth()

  if (!team) return null;

  const BASE_COLUMNS = ["s.no", "name", "email", "contact"];
  const customFieldsMap = team.customFields?.map(f => ({
    id: f.id,
    name: f.name.toLowerCase().trim()
  })) || [];

  const EXPECTED_COLUMNS = [...BASE_COLUMNS, ...customFieldsMap.map(f => f.name)];

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setValid(false);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const workbook = XLSX.read(evt.target.result, { type: "binary" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);

        if (rows.length === 0) {
          toast.error("File is empty");
          return;
        }

        const headers = Object.keys(rows[0]).map(h => h.toLowerCase().trim());
        const missing = EXPECTED_COLUMNS.filter(col => !headers.includes(col));

        if (missing.length) {
          toast.error("Invalid Columns", {
            description: `Missing: ${missing.join(", ")}`,
          });
          return;
        }

        setExcelData(rows);
        setValid(true);
        toast.success("Excel format verified");
      } catch (err) {
        toast.error("Error reading file");
      }
    };
    reader.readAsBinaryString(selected);
  };

  const handleUpload = async () => {
    // DEBUG: Check if user exists here
    console.log("Current User UID:", user?.uid);
    console.log("Team ID:", team?.id);

    if (!excelData.length || !team?.id || !user?.uid) {
        toast.error("Missing data or user session");
        return;
    }

    setLoading(true);
    const batch = writeBatch(db);
    
    // 1. References
    const membersRef = collection(db, "teams", team.id, "members");
    const teamRef = doc(db, "teams", team.id);
    const userRef = doc(db, "users", user.uid);
    
    const membersToUpdateUI = [];

    try {
        excelData.forEach((row) => {
            const newMemberRef = doc(membersRef);
            
            const memberPayload = {
                id: newMemberRef.id,
                name: row["name"] || row["Name"],
                email: row["email"] || row["Email"],
                contact: String(row["contact"] || row["Contact"] || ""),
                createdAt: serverTimestamp(),
                customData: {}
            };

            // Custom fields logic...
            customFieldsMap.forEach(field => {
                const rowValue = Object.entries(row).find(
                    ([key]) => key.toLowerCase().trim() === field.name
                )?.[1];
                if (rowValue !== undefined) {
                    memberPayload.customData[field.id] = rowValue;
                }
            });

            batch.set(newMemberRef, memberPayload);
            
            membersToUpdateUI.push({
                ...memberPayload,
                createdAt: new Date().toISOString() 
            });
        });

        // 2. Perform Increments
        // Update the specific team's count
        batch.update(teamRef, { 
            totalMembers: increment(excelData.length) 
        });

        // Update the user's global count
        batch.update(userRef, {
            memberCount: increment(excelData.length)
        });

        // 3. Commit
        await batch.commit();

        if (onSuccess) onSuccess(membersToUpdateUI);

        toast.success(`Imported ${excelData.length} members.`);
        onOpenChange(false);
        resetState(); 
    } catch (error) {
        console.error("Batch Update Failed:", error);
        toast.error("Upload failed", { description: error.message });
    } finally {
        setLoading(false);
    }
};

  const resetState = () => {
    setFile(null);
    setValid(false);
    setExcelData([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Bulk Member Import</DialogTitle>
          <DialogDescription>
            Importing to <span className="font-semibold text-foreground">{team.name}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="rounded-lg bg-muted/40 p-3 border text-sm">
            <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-muted-foreground uppercase">
              <Info className="h-3 w-3" />
              Required Headers
            </div>
            <div className="flex flex-wrap gap-1.5">
              {EXPECTED_COLUMNS.map((c) => (
                <Badge key={c} variant="secondary" className="text-[10px] py-0 capitalize">
                  {c}
                </Badge>
              ))}
            </div>
          </div>

          {/* THE FIXED UPLOAD BOX */}
          <div className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-10 transition-all cursor-pointer overflow-hidden ${
            valid 
              ? "border-green-500 bg-green-50/10" 
              : "border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/30"
          }`}>
            {/* This invisible input now fills the entire parent box 100%.
                The z-index ensures it catches all clicks and drops.
            */}
            <Input
              type="file"
              ref={fileInputRef}
              disabled={loading}
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="absolute inset-0 h-full w-full opacity-0 cursor-pointer z-50"
            />
            
            <div className="flex flex-col items-center gap-3 relative z-10 pointer-events-none">
              <div className={`p-3 rounded-full transition-colors ${
                valid ? "bg-green-500 text-white" : "bg-primary/10 text-primary"
              }`}>
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <FileSpreadsheet className="h-6 w-6" />}
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">{file ? file.name : "Choose Excel file"}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {valid ? "Click to change file" : "Click anywhere in this box or drag and drop"}
                </p>
              </div>
            </div>
          </div>

          {valid && (
            <div className="flex items-center justify-center gap-2 text-xs font-medium text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              {excelData.length} members ready for import
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button disabled={!valid || loading} onClick={handleUpload} className="px-6">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {loading ? "Importing..." : "Start Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}