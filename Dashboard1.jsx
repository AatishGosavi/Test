import { useState, useEffect, useId } from "react";
import Navbar from "./Header";
import StatsBar from "./StatsBar";
import Toolbar from "./Toolbar";
import RecordsTable from "./RecordsTable";
import EditModal from "./EditModal";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../controller/authSlice";
import { createLog } from "../api/logApi";
import { data, useNavigate, useParams } from "react-router-dom";
import {
  createQTicket,
  getQTickets,
  updateQTicket,
  deleteComplienceAct,
  getCountWithStatus,
  getAllTickets
} from "../api/qualityTApi";
import { getUsers } from "../api/autApi";
import { getUser } from "../api/autApi";

const getEmptyForm = () => ({
  projectNo: "",
  process_O_Name: "",
  department: "",
  customer: "",
  part_Descri: "",
  body_Color: "",
  batch_No: "",
  part_Type: "",
  sample_Category: "",
  application_Surface: "",
  d_Surface_Conditions: "",
  d_Treatment: "",
  b_Film: "",
  i_Sequence: "",
  overc: "",
  ds_T_Details: "",
  lami: "",
  sample_Submitted_No: "",
  submitted_For: [],
  attachment: [],
  test_Specs: "",
  reason_Sub: "",
  approval_Status: "",
  test_Report_Status: "",
  next_Date: "",
  test_Completed: "",
  evidences: [],
  remark: "",
});

export default function Home() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { userId } = useParams();
  const isReadOnly = Boolean(userId);



  const [searchTerm, setSearchTerm] = useState("");
  const [records, setRecords] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(getEmptyForm());
  const [deletedFiles, setDeletedFiles] = useState([]);
  const [buttonDisable,setButtonDisable] = useState(false)

  const { cList, count, allRecords } = useSelector((s) => s.quality);
  const { newUser, getUsersData } = useSelector((s) => s.qualityLogin);



  const user = JSON.parse(localStorage.getItem("User") || "null");

  const isQualityUser = user.name === "Quality"
  const useriD = user.id || null

  useEffect(() => {
    dispatch(getQTickets(userId));
    dispatch(getCountWithStatus(userId));
    dispatch(getUser(userId));
    dispatch(getAllTickets())
    dispatch(getUsers())
  }, [dispatch, userId]);

  useEffect(() => {
    if (user?.name === "Quality") {
      // Quality sees all records
      if (Array.isArray(allRecords)) {
        setRecords(allRecords);
      }
    } else {
      // Other users see cList data
      if (Array.isArray(cList?.data)) {
        setRecords(cList.data);
      }
    }
  }, [user, cList, allRecords]);

  const handleLogout = async () => {
    await dispatch(createLog({ email: user.email, action: "Logout", time: Date.now() }));
    dispatch(logout());
    navigate("/quality");
  };

  const openAddModal = () => {
    setFormData(getEmptyForm());
    setDeletedFiles([]);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData(getEmptyForm());
    setDeletedFiles([]);
  };

  const handleAddSave = async (e) => {
    e.preventDefault();
    setButtonDisable(true)
try{
    const fd = new FormData();

    const today = new Date();
const month = today.getMonth() + 1; // Jan = 1 ... Dec = 12
let fyStartYear;

// If current month is April (4) or later, FY starts this calendar year,
// else it started last year (for Jan–Mar)
if (month >= 4) {
  fyStartYear = today.getFullYear();
} else {
  fyStartYear = today.getFullYear() - 1;
}

const fyEndYear = fyStartYear + 1;

// Format e.g., "2025-26"
const fyString = `${fyStartYear}-${String(fyEndYear).slice(-2)}`;

const nextNumber = allRecords.length + 1; 

const projectNo = `NTPL/QC/${fyString}/${nextNumber}`;

    

    Object.entries(formData).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      // Append each array item
      value.forEach((v) => fd.append(`${key}[]`, v));
    } else {
      fd.append(key, value ?? "");
    }
  });

    fd.set("projectNo", projectNo);
    fd.set("department", user?.id || "");
    fd.set("process_O_Name",user?.email?.split('@')[0])
    formData.evidences.forEach((f) => fd.append("evidences", f.file));
    formData.attachment.forEach((f) => fd.append("attachment", f.file));

    deletedFiles.forEach((id) => fd.append("deletedFiles[]", id));

    await dispatch(createQTicket(fd));
    await dispatch(getQTickets(userId));
    await dispatch(getCountWithStatus(userId));
    await dispatch(getAllTickets())
    closeModal();
}catch(err){
  console.error("Error saving:", err);
}finally{
    setButtonDisable(false)
}
  };

  const handleEdit = async (updatedItem) => {
    try {

      const fd = new FormData();
      // Append form fields (non-array values)
      // Object.entries(updatedItem).forEach(([key, value]) => {
      //   if (Array.isArray(value)) return;
      //   fd.append(key, value ?? "");
      // });

      Object.entries(updatedItem).forEach(([key, value]) => {
        if (Array.isArray(value)) {
        value.forEach((v) => fd.append(`${key}[]`, v));
        return;
      }

        // If the value is an object with _id, send only the _id
        if (value && typeof value === "object" && "_id" in value) {
          fd.append(key, value._id);
        } else {
          fd.append(key, value ?? "");
        }
      });



      // r_User is just an ID string
      if (updatedItem?.r_User) {
        fd.append("r_User", updatedItem.r_User);
      }

      // Append evidence files
      if (updatedItem?.evidences?.length > 0) {
        updatedItem.evidences.forEach((item) => {
          if (item?.file instanceof File) {
            fd.append("evidences", item.file); // ✅ must match Multer field
          }
        });
      }

      // Append attachment files
      if (updatedItem?.attachment?.length > 0) {
        updatedItem.attachment.forEach((item) => {
          if (item?.file instanceof File) {
            fd.append("attachment", item.file); // ✅ must match Multer field
          }
        });
      }

      // Update compliance act
      await dispatch(
        updateQTicket({
          id: updatedItem._id,
          data: fd,
        })
      );

      // Create log
      await dispatch(
        createLog({
          email: user.email,
          action: "Update",
          time: Date.now(),
        })
      );

      // Refresh data
      await dispatch(getQTickets(userId));
      await dispatch(getAllTickets())
      await dispatch(getCountWithStatus(userId));
    } catch (error) {
      console.error("Error updating compliance act:", error);
    }
  };

  const handleDelete = async (item) => {
    await dispatch(deleteComplienceAct(item._id));
    await dispatch(createLog({ email: user.email, action: "Delete", time: Date.now() }));
    await dispatch(getQTickets(userId));
    await dispatch(getCountWithStatus(userId));
  };

  const filteredRecords = !searchTerm
    ? records
    : records.filter((r) =>
      r.projectNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.approval_Status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.department?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.next_Date?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  return (
    <>
      <Navbar onLogout={handleLogout} currentUser={user?.name || newUser?.data?.name} />

      <div className="container max-w-7xl mx-auto px-4 mt-6 min-h-screen bg-white w-full">
        <StatsBar currentUser={newUser?.data?.name || user?.name} stats={count} />

        <Toolbar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onAdd={openAddModal}
          isReadOnly={isReadOnly}
        />

        <RecordsTable
          data={filteredRecords}
          isQualityUser={isQualityUser}
          allUsers={getUsersData}
          onEdit={handleEdit}
          onDelete={handleDelete}
          isReadOnly={isReadOnly}
        />
      </div>

      <EditModal
        isOpen={isModalOpen}
        user={user}
        isQualityUser={isQualityUser}
        buttonDisable={buttonDisable}
        allUsers={getUsersData}
        formData={formData}
        onChange={setFormData}
        onClose={closeModal}
        onSave={handleAddSave}
        setDeletedFiles={setDeletedFiles}
      />
    </>
  );
}
