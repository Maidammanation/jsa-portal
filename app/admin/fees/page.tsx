"use client";

import { useEffect, useState } from "react";
import { SelectInput, TextInput } from "@/components/Forms";
import { Button } from "@/components/Buttons";
import {
  getClasses,
  getStudents,
  getFeeStructure,
  setClassFee,
  getAllPayments,
  recordPayment,
} from "@/services/database";
import { useAuth } from "@/lib/useAuth";
import { SCHOOL } from "@/settings/config";
import type { ClassRoom, Student } from "@/lib/types";

interface FeeRow {
  id: string;
  classId: string;
  amount: number;
}

interface PaymentRow {
  id: string;
  studentId: string;
  amount: number;
  datePaid: string;
}

export default function FeesPage() {
  const { profile } = useAuth();
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [feeStructure, setFeeStructure] = useState<FeeRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [feeInputs, setFeeInputs] = useState<Record<string, string>>({});
  const [savingClassId, setSavingClassId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [payStudentId, setPayStudentId] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const loadAll = () => {
    setLoading(true);
    Promise.all([
      getClasses(),
      getStudents(),
      getFeeStructure(SCHOOL.term, SCHOOL.session),
      getAllPayments(SCHOOL.term, SCHOOL.session),
    ]).then(([classList, studentList, fees, pays]) => {
      setClasses(classList as ClassRoom[]);
      setStudents(studentLis