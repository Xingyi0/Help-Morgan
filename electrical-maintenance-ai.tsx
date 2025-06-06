"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Zap,
  MapPin,
  Cloud,
  Wrench,
  Package,
  MessageCircle,
  Send,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Thermometer,
  Wind,
  Eye,
  Settings,
  X,
  Bell,
  Play,
  User,
  Check,
  Download,
  PenToolIcon as Tool,
  Loader2,
} from "lucide-react"
import jsPDF from "jspdf"
import OpenAI from 'openai'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface AlertData {
  id: string;
  message: string;
  time: string;
  stationInfo: {
    number: string;
    voltage: string;
    commissionDate: string;
    capacity: string;
    location: string;
    status: string;
  };
  weather: {
    temperature: string;
    wind: string;
    visibility: string;
    condition: string;
    suggestion: string;
  };
  tools: string[];
  parts: {
    name: string;
    stock: string;
    priority: string;
  }[];
  maintenanceSteps: string[];
  usedParts: string;
}

export default function ElectricalMaintenanceAI() {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [currentAlertIndex, setCurrentAlertIndex] = useState(0)
  const [activeTab, setActiveTab] = useState("preparation")
  const [showNotification, setShowNotification] = useState(false)
  const [isTaskStarted, setIsTaskStarted] = useState(false)
  const [isTaskCompleted, setIsTaskCompleted] = useState(false)
  const [taskStartTime, setTaskStartTime] = useState<Date | null>(null)
  const [taskEndTime, setTaskEndTime] = useState<Date | null>(null)
  const [maintenanceResult, setMaintenanceResult] = useState("")
  const [maintenanceNotes, setMaintenanceNotes] = useState("")
  const [generatedReport, setGeneratedReport] = useState<string | null>(null)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [chatMessages, setChatMessages] = useState([
    {
      type: "ai",
      message:
        "Hello! I'm your maintenance assistant. Please tell me about any issues you encounter, and I'll provide guidance based on equipment data and historical cases.",
      timestamp: "14:30",
    },
  ])
  const [currentMessage, setCurrentMessage] = useState("")
  const [alerts, setAlerts] = useState<AlertData[]>([])
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(true)
  const [errorLoadingAlerts, setErrorLoadingAlerts] = useState<string | null>(null)

  // Checklist states (from checklist.tsx)
  const [checklistItems, setChecklistItems] = useState<{ id: string; label: string; checked: boolean }[]>([])
  const [checklistProgress, setChecklistProgress] = useState(0)
  const [isSubmittingChecklist, setIsSubmittingChecklist] = useState(false)
  const [checklistSubmitted, setChecklistSubmitted] = useState(false)
  const [maintenanceChecklistItems, setMaintenanceChecklistItems] = useState<
    {
      id: string;
      label: string;
      checked: boolean;
      phase: "preparation" | "maintenance" | "verification";
    }[]
  >([])
  const [allChecklistItemsCompleted, setAllChecklistItemsCompleted] = useState(false)
  const [completedChecklistItems, setCompletedChecklistItems] = useState(0)
  const [totalChecklistItems, setTotalChecklistItems] = useState(0)

  // Get current alert data from the state (Moved back inside)
  const currentAlert = alerts.length > 0 ? alerts[currentAlertIndex] : null;

  // Fetch alerts from API on component mount
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const response = await fetch('/api/alerts')
        if (!response.ok) {
          throw new Error(`Error fetching alerts: ${response.statusText}`)
        }
        const data = await response.json()
        // Parse JSON strings back to objects/arrays
        const parsedData: AlertData[] = data.map((alert: any) => ({
          ...alert,
          stationInfo: JSON.parse(alert.stationInfo),
          weather: JSON.parse(alert.weather),
          tools: JSON.parse(alert.tools),
          parts: JSON.parse(alert.parts),
          maintenanceSteps: JSON.parse(alert.maintenanceSteps),
        }))
        setAlerts(parsedData)
      } catch (error: any) {
        console.error('Failed to fetch alerts:', error)
        setErrorLoadingAlerts(error.message)
      } finally {
        setIsLoadingAlerts(false)
      }
    }

    fetchAlerts()
  }, []) // Empty dependency array means this effect runs once on mount

  // Component loads notification on mount (only if alerts are loaded and available)
  useEffect(() => {
    if (!isTaskStarted && alerts.length > 0 && !isLoadingAlerts && !errorLoadingAlerts) {
      // Delay notification display to simulate new alert arrival
      const timer = setTimeout(() => {
        setShowNotification(true)
      }, 1000)

      return () => clearTimeout(timer)
    }
  }, [isTaskStarted, alerts, isLoadingAlerts, errorLoadingAlerts]) // Depend on alerts state

  // Generate checklist items based on current alert data using useCallback (from checklist.tsx)
  const generateChecklistItems = useCallback(() => {
    if (!currentAlert) return

    const items = [
      {
        id: "station",
        label: `Verify Substation #${currentAlert.stationInfo.number} location and access`,
        checked: false,
      },
      { id: "voltage", label: `Check ${currentAlert.stationInfo.voltage} voltage levels`, checked: false },
      { id: "safety", label: "Perform safety protocols and wear appropriate PPE", checked: false },
      ...(currentAlert.tools || []).map((tool: string, index: number) => ({
        id: `tool-${index}`,
        label: `Verify ${tool} is available and functional`,
        checked: false,
      })),
      ...(currentAlert.parts || [])
        .filter((part) => part.priority === "High")
        .map((part: { name: string; stock: string; priority: string }, index: number) => ({
          id: `part-${index}`,
          label: `Confirm ${part.name} availability (${part.stock})`,
          checked: false,
        })),
      {
        id: "weather",
        label: `Confirm weather conditions: ${currentAlert.weather.condition}, ${currentAlert.weather.temperature}`,
        checked: false,
      },
      { id: "documentation", label: "Prepare maintenance documentation and permits", checked: false },
      { id: "communication", label: "Establish communication with control center", checked: false },
    ]

    setChecklistItems(items)
    setChecklistProgress(0)
    setChecklistSubmitted(false)
  }, [currentAlert]) // Depend on currentAlert

  // Generate maintenance checklist items (from checklist.tsx)
  const generateMaintenanceChecklistItems = useCallback(() => {
    if (!currentAlert) return

    const items = [
      // Phase 1: Pre-departure preparation
      {
        id: "weather-check",
        label: `Confirm weather conditions: ${currentAlert.weather.condition}, ${currentAlert.weather.temperature}`,
        checked: false,
        phase: "preparation" as const,
      },
      {
        id: "documentation",
        label: "Prepare maintenance documentation and permits",
        checked: false,
        phase: "preparation" as const,
      },
      {
        id: "safety-protocols",
        label: "Perform safety protocols and wear appropriate PPE",
        checked: false,
        phase: "preparation" as const,
      },
      { id: "tools-verification", label: "Verify tools are available and functional", checked: false, phase: "preparation" as const },

      // Phase 2: During maintenance
      { id: "component-inspection", label: "Inspect all components status and connections", checked: false, phase: "maintenance" as const },
      { id: "damaged-parts-replacement", label: "Replace damaged and aging components", checked: false, phase: "maintenance" as const },
      { id: "electrical-connections", label: "Check and tighten all electrical connections", checked: false, phase: "maintenance" as const },
      { id: "insulation-test", label: "Perform insulation resistance testing", checked: false, phase: "maintenance" as const },

      // Phase 3: Verify all indicators are normal
      { id: "voltage-verification", label: `Verify ${currentAlert.stationInfo?.voltage} voltage levels are normal`, checked: false, phase: "verification" as const },
      { id: "load-test", label: "Perform load testing to confirm equipment normal operation", checked: false, phase: "verification" as const },
      { id: "protection-systems", label: "Verify protection systems function normally", checked: false, phase: "verification" as const },
      { id: "final-inspection", label: "Final inspection to confirm all indicators within normal range", checked: false, phase: "verification" as const },
    ]

    setMaintenanceChecklistItems(items)
    setTotalChecklistItems(items.length)
    setCompletedChecklistItems(0)
    setAllChecklistItemsCompleted(false)
  }, [currentAlert]) // Depend on currentAlert

  // Generate checklist when alert changes or task starts (from checklist.tsx)
  useEffect(() => {
    if (currentAlert && isTaskStarted) {
      generateChecklistItems();
      generateMaintenanceChecklistItems();
    } else if (!isTaskStarted) { // Reset checklists when task ends
       setChecklistItems([]);
       setChecklistProgress(0);
       setIsSubmittingChecklist(false);
       setChecklistSubmitted(false);
       setMaintenanceChecklistItems([]);
       setAllChecklistItemsCompleted(false);
       setCompletedChecklistItems(0);
       setTotalChecklistItems(0);
    }
  }, [currentAlert, isTaskStarted, generateChecklistItems, generateMaintenanceChecklistItems]); // Depend on currentAlert and isTaskStarted

  // Calculate task duration
  const getTaskDuration = () => {
    if (!taskStartTime) return "00:00:00";

    const endTime = taskEndTime || new Date();
    const diff = endTime.getTime() - taskStartTime.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  // Real-time task duration update
  const [taskDuration, setTaskDuration] = useState("00:00:00");

  useEffect(() => {
    if (isTaskStarted && taskStartTime && !isTaskCompleted) {
      const interval = setInterval(() => {
        setTaskDuration(getTaskDuration());
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isTaskStarted, taskStartTime, isTaskCompleted]);

  // Refresh alert function
  const handleRefreshAlert = async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    setShowNotification(false);

    // Simulate data loading delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Start maintenance task
    setIsTaskStarted(true);
    setIsTaskCompleted(false);
    setTaskStartTime(new Date());
    setTaskEndTime(null);
    setTaskDuration("00:00:00");
    setMaintenanceResult("");
    setMaintenanceNotes("");
    setGeneratedReport(null);
    // Switch to the first alert from the fetched data
    setCurrentAlertIndex((prev) => (prev + 1) % alerts.length);
    setIsRefreshing(false);
  };

  // Handle checklist item toggle (from checklist.tsx)
  const handleChecklistItemToggle = (id: string) => {
    const updatedItems = checklistItems.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item));

    setChecklistItems(updatedItems);

    // Calculate progress
    const checkedCount = updatedItems.filter((item) => item.checked).length;
    const totalCount = updatedItems.length; // Get total count
    const progress = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0; // Avoid division by zero
    setChecklistProgress(progress);
  };

  // Submit checklist to "database" (from checklist.tsx - simplified)
  const handleSubmitChecklist = async () => {
    setIsSubmittingChecklist(true);

    // Simulate API call to update database (Replace with actual API call later)
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Update "database" (in real app, this would be an API call)
    console.log("Inspection Checklist submitted:", {
      stationId: currentAlert?.stationInfo?.number, // Use optional chaining
      timestamp: new Date().toISOString(),
      items: checklistItems,
      completedBy: "John Smith", // Replace with actual user
      completionRate: checklistProgress,
    });

    setIsSubmittingChecklist(false);
    setChecklistSubmitted(true);
  };

  // Handle maintenance checklist item toggle (from checklist.tsx)
  const handleMaintenanceChecklistToggle = (id: string) => {
    const updatedItems = maintenanceChecklistItems.map((item) =>
      item.id === id ? { ...item, checked: !item.checked } : item,
    );

    setMaintenanceChecklistItems(updatedItems);

    // Calculate completed items and check if all are completed
    const completedCount = updatedItems.filter((item) => item.checked).length;
    const totalCount = updatedItems.length; // Get total count
    setCompletedChecklistItems(completedCount);
    setAllChecklistItemsCompleted(completedCount === totalCount);
  };

  // Complete maintenance (modified to check checklist completion)
  const handleCompleteTask = () => {
    if (!allChecklistItemsCompleted) {
      alert("Please complete all maintenance checklist items before ending the task!");
      return;
    }

    setIsTaskCompleted(true);
    setTaskEndTime(new Date());
    setTaskDuration(getTaskDuration());
    // Auto switch to maintenance log generation page
    setActiveTab("report");
  };

  // Generate maintenance log (add check for currentAlert)
  const handleGenerateReport = () => {
    if (!currentAlert) return;
    const report = `\
# Electrical Substation Maintenance Report

## Basic Maintenance Information
- **Substation Number**: ${currentAlert!.stationInfo?.number}
- **Maintenance Date**: ${new Date().toLocaleDateString("en-GB")}
- **Technician**: John Smith
- **Start Time**: ${taskStartTime?.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })}
- **End Time**: ${taskEndTime?.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })}
- **Duration**: ${taskDuration}

## Fault Description
${currentAlert!.message}

## Equipment Information
- **Voltage Level**: ${currentAlert!.stationInfo?.voltage}
- **Load Capacity**: ${currentAlert!.stationInfo?.capacity}
- **Commission Date**: ${currentAlert!.stationInfo?.commissionDate}
- **Equipment Location**: ${currentAlert!.stationInfo?.location}

## Maintenance Process
${(currentAlert!.maintenanceSteps || []).map((step: string, index: number) => `${index + 1}. ${step}`).join("\n")}

## Parts Used
${currentAlert!.usedParts}

## Maintenance Results
${maintenanceResult || "Maintenance completed successfully. Equipment restored to normal operation."}

## Additional Notes
${maintenanceNotes || "No additional remarks."}

## Weather Conditions
- **Temperature**: ${currentAlert!.weather?.temperature}
- **Wind**: ${currentAlert!.weather?.wind}
- **Weather**: ${currentAlert!.weather?.condition}
- **Visibility**: ${currentAlert!.weather?.visibility}

---
*Report generated: ${new Date().toLocaleString("en-GB")}*
    `;

    setGeneratedReport(report);
  };

  // Enhanced PDF export function with automatic pagination
  const handleExportPDF = async () => {
    if (!generatedReport || !currentAlert) return; // Add check for currentAlert

    setIsGeneratingPDF(true);

    try {
      // Create new PDF document
      const doc = new jsPDF();
      const pageHeight = doc.internal.pageSize.height;
      const pageWidth = doc.internal.pageSize.width;
      const margin = 20;
      const lineHeight = 6;
      let yPosition = 30;

      // Helper function to add new page if needed
      const checkPageBreak = (requiredSpace = 15) => {
        if (yPosition + requiredSpace > pageHeight - margin) {
          doc.addPage();
          yPosition = margin;
        }
      };

      // Helper function to add text with automatic wrapping and pagination
      const addText = (text: string, fontSize = 10, isBold = false) => {
        doc.setFontSize(fontSize);
        if (isBold) {
          doc.setFont("helvetica", "bold");
        } else {
          doc.setFont("helvetica", "normal");
        }

        const maxWidth = pageWidth - 2 * margin;
        const lines = doc.splitTextToSize(text, maxWidth);

        for (let i = 0; i < lines.length; i++) {
          checkPageBreak();
          doc.text(lines[i], margin, yPosition);
          yPosition += lineHeight;
        }
      };

      // Helper function to add section spacing
      const addSpacing = (space = 10) => {
        yPosition += space;
        checkPageBreak();
      };

      // Document header
      addText("ELECTRICAL SUBSTATION MAINTENANCE REPORT", 18, true);
      addText(`Station #${currentAlert!.stationInfo?.number}`, 14, true);
      addSpacing(15);

      // Basic Information Section
      addText("BASIC MAINTENANCE INFORMATION", 14, true);
      addSpacing(8);

      const basicInfo = [
        `Station Number: ${currentAlert!.stationInfo?.number}`,
        `Maintenance Date: ${new Date().toLocaleDateString("en-GB")}`,
        `Technician: John Smith`,
        `Start Time: ${taskStartTime?.toLocaleTimeString("en-GB")}`,
        `End Time: ${taskEndTime?.toLocaleTimeString("en-GB")}`,
        `Duration: ${taskDuration}`,
      ];

      basicInfo.forEach((info) => {
        addText(info, 10);
      });
      addSpacing();

      // Fault Description Section
      addText("FAULT DESCRIPTION", 14, true);
      addSpacing(8);
      addText(currentAlert!.message, 10);
      addSpacing();

      // Equipment Information Section
      addText("EQUIPMENT INFORMATION", 14, true);
      addSpacing(8);

      const equipmentInfo = [
        `Voltage Level: ${currentAlert!.stationInfo?.voltage}`,
        `Load Capacity: ${currentAlert!.stationInfo?.capacity}`,
        `Commission Date: ${currentAlert!.stationInfo?.commissionDate}`,
        `Location: ${currentAlert!.stationInfo?.location}`,
      ];

      equipmentInfo.forEach((info) => {
        addText(info, 10);
      });
      addSpacing();

      // Maintenance Process Section
      addText("MAINTENANCE PROCESS", 14, true);
      addSpacing(8);

      (currentAlert!.maintenanceSteps || []).forEach((step, index) => {
        addText(`${index + 1}. ${step}`, 10);
      });
      addSpacing();

      // Parts Used Section
      addText("PARTS USED", 14, true);
      addSpacing(8);
      addText(currentAlert!.usedParts, 10);
      addSpacing();

      // Maintenance Results Section
      addText("MAINTENANCE RESULTS", 14, true);
      addSpacing(8);
      const result = maintenanceResult || "Maintenance completed successfully. Equipment restored to normal operation."
      addText(result, 10);
      addSpacing();

      // Additional Notes Section
      addText("ADDITIONAL NOTES", 14, true);
      addSpacing(8);
      const notes = maintenanceNotes || "No additional remarks."
      addText(notes, 10);
      addSpacing();

      // Weather Conditions Section
      addText("WEATHER CONDITIONS", 14, true);
      addSpacing(8);

      const weatherInfo = [
        `Temperature: ${currentAlert!.weather?.temperature}`,
        `Wind: ${currentAlert!.weather?.wind}`,
        `Weather: ${currentAlert!.weather?.condition}`,
        `Visibility: ${currentAlert!.weather?.visibility}`,
      ]

      weatherInfo.forEach((info) => {
        addText(info, 10);
      })
      addSpacing()

      // Footer
      checkPageBreak(20)
      doc.setFontSize(8)
      doc.setFont("helvetica", "italic")
      doc.text(`Report generated: ${new Date().toLocaleString("en-GB")}`, margin, yPosition)

      // Add page numbers
      const totalPages = doc.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setFont("helvetica", "normal")
        doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 30, pageHeight - 10)
      }

      // Generate filename
      const fileName = `maintenance-report-${currentAlert!.stationInfo?.number}-${new Date().toISOString().split("T")[0]}.pdf`

      // Save PDF
      doc.save(fileName)

      // Show success message
      alert("PDF report has been successfully generated and downloaded!")
    } catch (error) {
      console.error("PDF generation failed:", error)
      alert("PDF generation failed. Please try again.")
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  const handleSendMessage = async () => {
    if (!currentMessage.trim()) return;

    const userMessage = {
      type: "user",
      message: currentMessage,
      timestamp: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setCurrentMessage("");

    // Use DeepSeek API Key and base URL
    const apiKey = process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY; // Use DeepSeek API key
    const baseUrl = "https://api.deepseek.com/v1"; // DeepSeek API base URL

    if (!apiKey) {
      console.error("DeepSeek API key is not set.");
       setChatMessages((prev) => [
        ...prev,
        {
          type: "ai",
          message: "Error: DeepSeek API key is not configured.",
          timestamp: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      return;
    }

    try {
      // Create OpenAI client instance with DeepSeek base URL
      const openai = new OpenAI({
        apiKey: apiKey,
        baseURL: baseUrl,
        dangerouslyAllowBrowser: true, // Allow in browser environment for testing
      });

      // Call DeepSeek chat completions API
      const response = await openai.chat.completions.create({
        model: "deepseek-chat", // Specify the DeepSeek model
        messages: [
          { role: "system", content: "You are a helpful maintenance assistant." }, // System message
          { role: "user", content: currentMessage }, // User message
        ],
         temperature: 0.7,
         max_tokens: 500,
      });

      // Extract AI response
      const aiResponse = response.choices?.[0]?.message?.content || "No response from AI.";

      setChatMessages((prev) => [
        ...prev,
        {
          type: "ai",
          message: aiResponse,
          timestamp: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);

    } catch (error: any) {
      console.error("Error calling DeepSeek API:", error);
       setChatMessages((prev) => [
        ...prev,
        {
          type: "ai",
          message: `Error: Failed to connect to AI service. ${error.message || ''}`,
          timestamp: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }
  };

  // End task function (modified to reset checklist states)
  const handleEndTask = () => {
    setIsTaskStarted(false)
    setIsTaskCompleted(false)
    setTaskStartTime(null)
    setTaskEndTime(null)
    setTaskDuration("00:00:00")
    setMaintenanceResult("")
    setMaintenanceNotes("")
    setGeneratedReport(null)
    // Reset checklist states
    setChecklistItems([])
    setChecklistProgress(0)
    setIsSubmittingChecklist(false)
    setChecklistSubmitted(false)
    setMaintenanceChecklistItems([])
    setAllChecklistItemsCompleted(false)
    setCompletedChecklistItems(0)
    setTotalChecklistItems(0)
    setShowNotification(true)
  }

  // Show loading or error message while fetching alerts
  if (isLoadingAlerts) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mr-2" />
        <span className="text-xl text-gray-700">Loading maintenance alerts...</span>
      </div>
    );
  }

  if (errorLoadingAlerts) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex justify-center items-center">
        <AlertTriangle className="h-8 w-8 text-red-600 mr-2" />
        <span className="text-xl text-gray-700">Error loading alerts: {errorLoadingAlerts}</span>
      </div>
    );
  }

  if (!currentAlert) {
     return (
      <div className="min-h-screen bg-gray-50 p-4 flex justify-center items-center">
        <AlertTriangle className="h-8 w-8 text-yellow-600 mr-2" />
        <span className="text-xl text-gray-700">No alerts available.</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Electrical Substation Maintenance AI Assistant</h1>
          <p className="text-gray-600">
            Intelligent assistance for electrical engineers in substation fault diagnosis and maintenance
          </p>
        </div>

        {/* Current maintenance task bar */}
        {isTaskStarted && currentAlert && (
          <div className="mb-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg shadow-lg">
            <div className="p-5">
              {/* Header with status icon and title */}
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-white/20 p-2 rounded-full">
                  {isTaskCompleted ? <Check className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">
                    {isTaskCompleted ? "Maintenance Task Completed" : "Current Maintenance Task"}
                  </h3>
                  <p className="text-blue-100 mt-1 text-sm md:text-base">{currentAlert.message}</p>
                </div>
              </div>

              {/* Main content in two rows */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mt-4">
                {/* First row: Location and status */}
                <div className="col-span-12 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-blue-100 pb-3 border-b border-white/20">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{currentAlert.stationInfo?.location}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Zap className="h-3 w-3 flex-shrink-0" />
                    <span>Substation #{currentAlert.stationInfo?.number}</span>
                  </div>
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                    {isTaskCompleted ? "Maintenance Complete" : currentAlert.stationInfo?.status}
                  </Badge>
                </div>

                {/* Second row: Time info and action buttons */}
                <div className="md:col-span-4 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4 text-blue-200" />
                    <span className="text-sm text-blue-200">Start Time</span>
                  </div>
                  <p className="text-lg font-mono">
                    {taskStartTime?.toLocaleTimeString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </p>
                </div>

                <div className="md:col-span-3 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="h-4 w-4 text-blue-200" />
                    <span className="text-sm text-blue-200">Duration</span>
                  </div>
                  <p className="text-lg font-mono font-bold">{taskDuration}</p>
                </div>

                <div className="md:col-span-5 flex items-center justify-start md:justify-end gap-3 mt-2 md:mt-0">
                  {!isTaskCompleted ? (
                    <Button
                      onClick={handleCompleteTask}
                      className="bg-green-600 hover:bg-green-700 text-white"
                      size="sm"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Complete Maintenance
                    </Button>
                  ) : (
                    <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-300 py-2 px-3">
                      <Check className="h-3 w-3 mr-1" />
                      Completed
                    </Badge>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEndTask}
                    className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                  >
                    End Task
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notification-style fault alert */}
        {showNotification && !isTaskStarted && currentAlert && (
          <div
            className="fixed top-4 right-4 left-4 md:left-auto md:w-96 z-50 transform transition-all duration-500 ease-in-out animate-slide-in"
            style={{
              animation: "slide-in 0.5s ease-out forwards",
            }}
          >
            <Alert
              className="border-red-200 bg-red-50 shadow-lg rounded-lg cursor-pointer hover:bg-red-100 transition-colors"
              onClick={handleRefreshAlert}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-red-600 p-2 rounded-full">
                    <Bell className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-red-800">Fault Alert</p>
                    <AlertDescription className="text-red-800">{currentAlert.message}</AlertDescription>
                    <p className="text-xs text-red-600 mt-1">{currentAlert.time}</p>
                  </div>
                </div>
                <button
                  className="text-gray-500 hover:text-gray-700"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowNotification(false)
                  }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </Alert>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="preparation" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Pre-Maintenance Preparation
            </TabsTrigger>
            <TabsTrigger value="maintenance-checklist" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Maintenance Checklist
              {isTaskStarted && totalChecklistItems > 0 && !allChecklistItemsCompleted && (
                <Badge variant="outline" className="ml-1 bg-white/10 text-xs">
                  {Math.round((completedChecklistItems / totalChecklistItems) * 100)}%
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="assistance" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Maintenance Assistance
            </TabsTrigger>
            <TabsTrigger value="report" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Maintenance Report Generation
              {isTaskCompleted && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs">
                  !
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="inspection" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Equipment Inspection
              {isTaskStarted && checklistItems.length > 0 && !checklistSubmitted && (
                <Badge variant="outline" className="ml-1 bg-white/10 text-xs">
                  {checklistProgress}%
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Pre-maintenance preparation */}
          <TabsContent value="preparation" className="space-y-6">
            {currentAlert && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Substation basic information */}
              <Card className={isRefreshing ? "opacity-50 pointer-events-none" : ""}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-blue-600" />
                    Substation Information
                    {isRefreshing && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Station Number</p>
                        <p className="font-semibold">{currentAlert.stationInfo?.number}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Voltage Level</p>
                        <p className="font-semibold">{currentAlert.stationInfo?.voltage}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Commission Date</p>
                        <p className="font-semibold">{currentAlert.stationInfo?.commissionDate}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Load Capacity</p>
                        <p className="font-semibold">{currentAlert.stationInfo?.capacity}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    <MapPin className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{currentAlert.stationInfo?.location}</span>
                  </div>
                  <Badge variant="outline" className="text-green-700 border-green-300">
                      Status: {currentAlert.stationInfo?.status}
                  </Badge>
                </CardContent>
              </Card>

              {/* Weather information */}
              <Card className={isRefreshing ? "opacity-50 pointer-events-none" : ""}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cloud className="h-5 w-5 text-blue-600" />
                    Weather Conditions
                    {isRefreshing && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Thermometer className="h-4 w-4 text-red-500" />
                      <div>
                        <p className="text-sm text-gray-600">Temperature</p>
                          <p className="font-semibold">{currentAlert.weather?.temperature}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Wind className="h-4 w-4 text-blue-500" />
                      <div>
                        <p className="text-sm text-gray-600">Wind</p>
                          <p className="font-semibold">{currentAlert.weather?.wind}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-600">Visibility</p>
                          <p className="font-semibold">{currentAlert.weather?.visibility}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Cloud className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-600">Conditions</p>
                          <p className="font-semibold">{currentAlert.weather?.condition}</p>
                      </div>
                    </div>
                  </div>
                  <Alert className="mt-4 border-yellow-200 bg-yellow-50">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-800">
                        <strong>Recommendation:</strong> {currentAlert.weather?.suggestion}
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              {/* Required tools */}
              <Card className={isRefreshing ? "opacity-50 pointer-events-none" : ""}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wrench className="h-5 w-5 text-orange-600" />
                    Recommended Tools
                    {isRefreshing && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600"></div>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                      {(currentAlert.tools || []).map((tool, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm">{tool}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Replacement parts */}
              <Card className={isRefreshing ? "opacity-50 pointer-events-none" : ""}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-purple-600" />
                    Potential Replacement Parts
                    {isRefreshing && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                      {(currentAlert.parts || []).map((part, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{part.name}</p>
                          <p className="text-sm text-gray-600">{part.stock}</p>
                        </div>
                        <Badge
                          variant={
                            part.priority === "High"
                              ? "destructive"
                              : part.priority === "Medium"
                                ? "default"
                                : "secondary"
                          }
                        >
                          {part.priority} Priority
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
            )}
          </TabsContent>

          {/* Maintenance Checklist Content (from checklist.tsx) */}
          <TabsContent value="maintenance-checklist">
            {currentAlert && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-blue-600" />
                    Maintenance Checklist
                  </CardTitle>
                  <CardDescription>
                    Complete maintenance tasks following standard procedures, ensure all steps are executed
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!isTaskStarted ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Active Maintenance Task</h3>
                      <p className="text-gray-500 max-w-md">
                        Please start a maintenance task from the fault notification, then return to this page to complete the
                        maintenance checklist.
                      </p>
                    </div>
                  ) : maintenanceChecklistItems.length === 0 ? (
                     <div className="flex flex-col items-center justify-center py-8 text-center">
                       <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
                       <h3 className="text-lg font-medium mb-2">No Checklist Items Generated</h3>
                       <p className="text-gray-500 max-w-md">
                         Maintenance checklist items will be generated when a task is started.
                       </p>
                     </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Progress overview */}
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium text-blue-900">Overall Progress</h3>
                          <span className="text-sm text-blue-700">
                            {completedChecklistItems} / {totalChecklistItems} items completed
                          </span>
                        </div>
                        <div className="w-full bg-blue-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${totalChecklistItems > 0 ? (completedChecklistItems / totalChecklistItems) * 100 : 0}%`,
                            }}
                          ></div>
                        </div>
                      </div>

                      {/* Phase 1: Pre-departure preparation */}
                      <div className="border rounded-lg overflow-hidden">
                        <div className="bg-green-50 px-4 py-3 border-b">
                          <h3 className="font-medium text-green-800 flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-green-600 text-white text-sm flex items-center justify-center">
                              1
                            </div>
                            Pre-departure Preparation
                          </h3>
                        </div>
                        <div className="divide-y">
                          {maintenanceChecklistItems
                            .filter((item) => item.phase === "preparation")
                            .map((item) => (
                              <div
                                key={item.id}
                                className={`px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors ${item.checked ? "bg-green-50" : ""}`}
                              >
                                <div
                                  className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer ${item.checked ? "bg-green-500 border-green-500 text-white" : "border-gray-300"}`}
                                  onClick={() => handleMaintenanceChecklistToggle(item.id)}
                                >
                                  {item.checked && <Check className="h-3 w-3" />}
                                </div>
                                <label
                                  className={`flex-1 cursor-pointer ${item.checked ? "text-gray-500 line-through" : "text-gray-900"}`}
                                  onClick={() => handleMaintenanceChecklistToggle(item.id)}
                                >
                                  {item.label}
                                </label>
                              </div>
                            ))}
                        </div>
                      </div>

                      {/* Phase 2: During maintenance */}
                      <div className="border rounded-lg overflow-hidden">
                        <div className="bg-orange-50 px-4 py-3 border-b">
                          <h3 className="font-medium text-orange-800 flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-orange-600 text-white text-sm flex items-center justify-center">
                              2
                            </div>
                            Maintenance Execution
                          </h3>
                        </div>
                        <div className="divide-y">
                          {maintenanceChecklistItems
                            .filter((item) => item.phase === "maintenance")
                            .map((item) => (
                              <div
                                key={item.id}
                                className={`px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors ${item.checked ? "bg-green-50" : ""}`}
                              >
                                <div
                                  className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer ${item.checked ? "bg-green-500 border-green-500 text-white" : "border-gray-300"}`}
                                  onClick={() => handleMaintenanceChecklistToggle(item.id)}
                                >
                                  {item.checked && <Check className="h-3 w-3" />}
                                </div>
                                <label
                                  className={`flex-1 cursor-pointer ${item.checked ? "text-gray-500 line-through" : "text-gray-900"}`}
                                  onClick={() => handleMaintenanceChecklistToggle(item.id)}
                                >
                                  {item.label}
                                </label>
                              </div>
                            ))}
                        </div>
                      </div>

                      {/* Phase 3: Verify indicators */}
                      <div className="border rounded-lg overflow-hidden">
                        <div className="bg-blue-50 px-4 py-3 border-b">
                          <h3 className="font-medium text-blue-800 flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-sm flex items-center justify-center">
                              3
                            </div>
                            Verify All Indicators Normal
                          </h3>
                        </div>
                        <div className="divide-y">
                          {maintenanceChecklistItems
                            .filter((item) => item.phase === "verification")
                            .map((item) => (
                              <div
                                key={item.id}
                                className={`px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors ${item.checked ? "bg-green-50" : ""}`}
                              >
                                <div
                                  className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer ${item.checked ? "bg-green-500 border-green-500 text-white" : "border-gray-300"}`}
                                  onClick={() => handleMaintenanceChecklistToggle(item.id)}
                                >
                                  {item.checked && <Check className="h-3 w-3" />}
                                </div>
                                <label
                                  className={`flex-1 cursor-pointer ${item.checked ? "text-gray-500 line-through" : "text-gray-900"}`}
                                  onClick={() => handleMaintenanceChecklistToggle(item.id)}
                                >
                                  {item.label}
                                </label>
                              </div>
                            ))}
                        </div>
                      </div>

                      {/* Completion status prompt */}
                      {allChecklistItemsCompleted ? (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-center gap-2 text-green-800">
                            <CheckCircle className="h-5 w-5" />
                            <span className="font-medium">All maintenance checklist items completed!</span>
                          </div>
                          <p className="text-sm text-green-700 mt-1">
                            You can now click the "Complete Maintenance" button to finish the maintenance task.
                          </p>
                        </div>
                      ) : (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                          <div className="flex items-center gap-2 text-amber-800">
                            <AlertTriangle className="h-5 w-5" />
                            <span className="font-medium">Please complete all checklist items</span>
                          </div>
                          <p className="text-sm text-amber-700 mt-1">
                            {totalChecklistItems - completedChecklistItems} more items need to be completed before finishing
                            the maintenance task.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Maintenance assistance */}
          <TabsContent value="assistance">
            <Card className="h-[600px] flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-blue-600" />
                  Real-time Maintenance Assistance
                </CardTitle>
                <CardDescription>
                  Ask any maintenance-related questions. AI will provide guidance based on equipment data and historical
                  cases.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <ScrollArea className="flex-1 pr-4 mb-4">
                  <div className="space-y-4">
                    {chatMessages.map((msg, index) => (
                      <div key={index} className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[80%] p-3 rounded-lg ${msg.type === "user" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"} text-sm leading-relaxed`}
                        >
                          {msg.type === "user" ? (
                            <p className="text-sm">{msg.message}</p>
                          ) : (
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.message}</ReactMarkdown>
                          )}
                          <p className={`text-xs mt-1 ${msg.type === "user" ? "text-blue-100" : "text-gray-500"}`}>
                            {msg.timestamp}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter your question, e.g., 'Is equipment A broken?' or 'Should I check B?'"
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                    className="flex-1"
                  />
                  <Button onClick={handleSendMessage} size="icon">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Maintenance report generation */}
          <TabsContent value="report">
            {generatedReport ? (
              // Display generated complete report
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-green-600" />
                    Complete Maintenance Report
                  </CardTitle>
                  <CardDescription>Maintenance report has been generated successfully</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <pre className="whitespace-pre-wrap text-sm font-mono">{generatedReport}</pre>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button className="flex-1" onClick={handleExportPDF} disabled={isGeneratingPDF}>
                      {isGeneratingPDF ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generating PDF...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Export PDF Report
                        </>
                      )}
                    </Button>
                    <Button variant="outline" onClick={() => setGeneratedReport(null)}>
                      Edit Report
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : currentAlert && (
              // Report generation interface
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-green-600" />
                      Maintenance Report Preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h3 className="font-semibold mb-2">Basic Maintenance Information</h3>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <p>
                            <strong>Substation:</strong> {currentAlert.stationInfo?.number}
                          </p>
                          <p>
                            <strong>Date:</strong> {new Date().toLocaleDateString("en-GB")}
                          </p>
                          <p>
                            <strong>Technician:</strong> John Smith
                          </p>
                          <p>
                            <strong>Start Time:</strong>{" "}
                            {taskStartTime?.toLocaleTimeString("en-GB", {
                              hour: "2-digit",
                              minute: "2-digit",
                            }) || "Pending"}
                          </p>
                        </div>
                      </div>

                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h3 className="font-semibold mb-2">Fault Description</h3>
                        <p className="text-sm">{currentAlert.message}</p>
                      </div>

                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h3 className="font-semibold mb-2">Maintenance Process</h3>
                        <ul className="text-sm space-y-1">
                          {(currentAlert.maintenanceSteps || []).map((step, index) => (
                            <li key={index}>• {step}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h3 className="font-semibold mb-2">Parts Used</h3>
                        <p className="text-sm">{currentAlert.usedParts}</p>
                      </div>

                      {isTaskStarted && (
                        <div
                          className={`p-4 rounded-lg border ${isTaskCompleted ? "bg-green-50 border-green-200" : "bg-blue-50 border-blue-200"}`}
                        >
                          <h3 className={`font-semibold mb-2 ${isTaskCompleted ? "text-green-800" : "text-blue-800"}`}>
                            Current Task Status
                          </h3>
                          <div className={`text-sm ${isTaskCompleted ? "text-green-700" : "text-blue-700"}`}>
                            <p>
                              <strong>Duration:</strong> {taskDuration}
                            </p>
                            <p>
                              <strong>Status:</strong> {isTaskCompleted ? "Completed" : "In Progress"}
                            </p>
                            {isTaskCompleted && (
                              <p>
                                <strong>End Time:</strong>{" "}
                                {taskEndTime?.toLocaleTimeString("en-GB", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                })}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Report Generation Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Maintenance Results</label>
                      <Textarea
                        placeholder="Please describe the maintenance results and current equipment status..."
                        className="mt-1"
                        value={maintenanceResult}
                        onChange={(e) => setMaintenanceResult(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Additional Notes</label>
                      <Textarea
                        placeholder="Any other information to record..."
                        className="mt-1"
                        value={maintenanceNotes}
                        onChange={(e) => setMaintenanceNotes(e.target.value)}
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        Maintenance Duration: {isTaskStarted ? taskDuration : "Pending"}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {isTaskCompleted ? (
                        <Button className="w-full" onClick={handleGenerateReport}>
                          <FileText className="h-4 w-4 mr-2" />
                          Generate Complete Maintenance Report
                        </Button>
                      ) : (
                        <Button className="w-full" disabled>
                          <Tool className="h-4 w-4 mr-2" />
                          Please Complete Maintenance Task First
                        </Button>
                      )}
                      <Button variant="outline" className="w-full" disabled={!isTaskCompleted}>
                        Export PDF Report
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Equipment Inspection Checklist Content (from checklist.tsx) */}
          <TabsContent value="inspection">
            {currentAlert && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Equipment Inspection Checklist
                  </CardTitle>
                  <CardDescription>Verify equipment status before proceeding with maintenance</CardDescription>
                </CardHeader>
                <CardContent>
                  {!isTaskStarted ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Active Maintenance Task</h3>
                      <p className="text-gray-500 max-w-md">
                        Please start a maintenance task from the notification alert to generate an inspection checklist.
                      </p>
                    </div>
                  ) : checklistItems.length === 0 ? (
                     <div className="flex flex-col items-center justify-center py-8 text-center">
                       <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
                       <h3 className="text-lg font-medium mb-2">No Checklist Items Generated</h3>
                       <p className="text-gray-500 max-w-md">
                         Inspection checklist items will be generated when a task is started.
                       </p>
                     </div>
                  ) : checklistSubmitted ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                      <h3 className="text-lg font-medium mb-2">Inspection Completed</h3>
                      <p className="text-gray-500 max-w-md mb-4">
                        Equipment inspection checklist has been successfully submitted to the database.
                      </p>
                      <Button variant="outline" onClick={generateChecklistItems}>
                        Reset Checklist
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">Inspection Progress</h3>
                          <p className="text-sm text-gray-500">
                            {checklistItems.filter((item) => item.checked).length} of {checklistItems.length} items checked
                          </p>
                        </div>
                        <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 transition-all duration-300"
                            style={{ width: `${checklistProgress}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="border rounded-lg overflow-hidden">
                        <div className="bg-gray-50 px-4 py-3 border-b">
                          <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-500">
                            <div className="col-span-1">Status</div>
                            <div className="col-span-11">Inspection Item</div>
                          </div>
                        </div>

                        <div className="divide-y">
                          {checklistItems.map((item) => (
                            <div
                              key={item.id}
                              className={`px-4 py-3 grid grid-cols-12 gap-4 items-center hover:bg-gray-50 transition-colors ${item.checked ? "bg-green-50" : ""}`}
                            >
                              <div className="col-span-1">
                                <div
                                  className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer ${item.checked ? "bg-green-500 border-green-500 text-white" : "border-gray-300"}`}
                                  onClick={() => handleChecklistItemToggle(item.id)}
                                >
                                  {item.checked && <Check className="h-3 w-3" />}
                                </div>
                              </div>
                              <label
                                className={`col-span-11 cursor-pointer ${item.checked ? "text-gray-500" : "text-gray-900"}`}
                                onClick={() => handleChecklistItemToggle(item.id)}
                              >
                                {item.label}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button
                          onClick={handleSubmitChecklist}
                          disabled={checklistProgress < 100 || isSubmittingChecklist}
                          className="min-w-[150px]"
                        >
                          {isSubmittingChecklist ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Updating...
                            </>
                          ) : checklistProgress < 100 ? (
                            "Complete All Items"
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Update Database
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
