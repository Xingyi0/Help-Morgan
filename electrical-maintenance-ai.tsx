"use client"

import { useState, useEffect } from "react"
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

  // Simulated fault alert data
  const alertData = [
    {
      id: "A-205",
      message: "Substation #A-205 voltage anomaly detected, requires immediate maintenance",
      time: "28 December 2024, 14:15",
      stationInfo: {
        number: "A-205",
        voltage: "35kV/10kV",
        commissionDate: "March 2016",
        capacity: "2×16MVA",
        location: "15 Rue de la Paix, 75001 Paris, France",
        status: "Partial Fault",
      },
      weather: {
        temperature: "-2°C",
        wind: "Force 3",
        visibility: "Good",
        condition: "Cloudy",
        suggestion:
          "Low temperature conditions. Ensure proper cold weather protection. Recommend starting maintenance after 10:00 AM.",
      },
      tools: [
        "Digital Multimeter",
        "Insulation Resistance Tester",
        "Clamp Ammeter",
        "Screwdriver Set",
        "Electrical Tape",
        "Safety Helmet",
        "Insulating Gloves",
        "Voltage Detector",
      ],
      parts: [
        { name: "35kV Lightning Arrester", stock: "In Stock", priority: "High" },
        { name: "10kV Switchgear Fuse", stock: "In Stock", priority: "Medium" },
        { name: "Voltage Transformer", stock: "Requires Allocation", priority: "Low" },
        { name: "Contactor", stock: "In Stock", priority: "Medium" },
      ],
      maintenanceSteps: [
        "Inspect 35kV lightning arrester - Found damaged insulator",
        "Replace lightning arrester insulator",
        "Test insulation resistance - Normal readings",
        "Restore power supply and conduct final testing",
      ],
      usedParts: "35kV Lightning Arrester Insulator × 1",
    },
    {
      id: "B-108",
      message: "Substation #B-108 transformer overheating alarm, temperature exceeds safety threshold",
      time: "28 December 2024, 15:42",
      stationInfo: {
        number: "B-108",
        voltage: "110kV/35kV",
        commissionDate: "August 2018",
        capacity: "1×50MVA",
        location: "42 Unter den Linden, 10117 Berlin, Germany",
        status: "Overheating Warning",
      },
      weather: {
        temperature: "8°C",
        wind: "Force 2",
        visibility: "Excellent",
        condition: "Clear",
        suggestion: "Excellent weather conditions. Safe to proceed with immediate maintenance.",
      },
      tools: [
        "Infrared Thermometer",
        "Oil Temperature Gauge",
        "Insulating Oil Tester",
        "Wrench Set",
        "Cooling Fan",
        "Safety Helmet",
        "Protective Suit",
        "Gas Detector",
      ],
      parts: [
        { name: "Transformer Cooler", stock: "In Stock", priority: "High" },
        { name: "Temperature Sensor", stock: "In Stock", priority: "High" },
        { name: "Insulating Oil", stock: "Sufficient", priority: "Medium" },
        { name: "Heat Sink", stock: "Requires Allocation", priority: "Medium" },
      ],
      maintenanceSteps: [
        "Inspect transformer temperature sensor - Found sensor malfunction",
        "Replace temperature sensor",
        "Check cooling system - Clean heat sinks",
        "Test temperature monitoring system - Normal operation",
      ],
      usedParts: "Temperature Sensor × 1",
    },
    {
      id: "C-312",
      message: "Substation #C-312 switchgear fault, unable to operate normally",
      time: "28 December 2024, 16:28",
      stationInfo: {
        number: "C-312",
        voltage: "10kV/0.4kV",
        commissionDate: "January 2020",
        capacity: "3×800kVA",
        location: "25 Via del Corso, 00186 Rome, Italy",
        status: "Switch Fault",
      },
      weather: {
        temperature: "18°C",
        wind: "Force 1",
        visibility: "Good",
        condition: "Light Rain",
        suggestion:
          "Light rain conditions. Take precautions for slip hazards and equipment waterproofing. Bring rain protection equipment.",
      },
      tools: [
        "Switch Tester",
        "Contact Resistance Tester",
        "Mechanical Characteristics Tester",
        "Hex Wrench",
        "Lubricating Oil",
        "Safety Helmet",
        "Insulating Boots",
        "Rain Cover",
      ],
      parts: [
        { name: "Vacuum Circuit Breaker", stock: "In Stock", priority: "High" },
        { name: "Operating Mechanism", stock: "Requires Allocation", priority: "High" },
        { name: "Auxiliary Switch", stock: "In Stock", priority: "Medium" },
        { name: "Spring Energy Storage Mechanism", stock: "In Stock", priority: "Low" },
      ],
      maintenanceSteps: [
        "Inspect vacuum circuit breaker - Found contact wear",
        "Replace vacuum circuit breaker",
        "Adjust operating mechanism",
        "Test switching function - Normal operation",
      ],
      usedParts: "Vacuum Circuit Breaker × 1",
    },
  ]

  // Component loads notification on mount
  useEffect(() => {
    if (!isTaskStarted) {
      // Delay notification display to simulate new alert arrival
      const timer = setTimeout(() => {
        setShowNotification(true)
      }, 1000)

      return () => clearTimeout(timer)
    }
  }, [isTaskStarted])

  // Calculate task duration
  const getTaskDuration = () => {
    if (!taskStartTime) return "00:00:00"

    const endTime = taskEndTime || new Date()
    const diff = endTime.getTime() - taskStartTime.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  // Real-time task duration update
  const [taskDuration, setTaskDuration] = useState("00:00:00")

  useEffect(() => {
    if (isTaskStarted && taskStartTime && !isTaskCompleted) {
      const interval = setInterval(() => {
        setTaskDuration(getTaskDuration())
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [isTaskStarted, taskStartTime, isTaskCompleted])

  // Refresh alert function
  const handleRefreshAlert = async () => {
    if (isRefreshing) return

    setIsRefreshing(true)
    setShowNotification(false)

    // Simulate data loading delay
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Switch to next alert data
    setCurrentAlertIndex((prev) => (prev + 1) % alertData.length)
    setIsRefreshing(false)

    // Start maintenance task
    setIsTaskStarted(true)
    setIsTaskCompleted(false)
    setTaskStartTime(new Date())
    setTaskEndTime(null)
    setTaskDuration("00:00:00")
    setMaintenanceResult("")
    setMaintenanceNotes("")
    setGeneratedReport(null)
  }

  // Get current alert data
  const currentAlert = alertData[currentAlertIndex]

  // Complete maintenance
  const handleCompleteTask = () => {
    setIsTaskCompleted(true)
    setTaskEndTime(new Date())
    setTaskDuration(getTaskDuration())
    // Auto switch to maintenance log generation page
    setActiveTab("report")
  }

  // Generate maintenance log
  const handleGenerateReport = () => {
    const report = `
# Electrical Substation Maintenance Report

## Basic Maintenance Information
- **Substation Number**: ${currentAlert.stationInfo.number}
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
${currentAlert.message}

## Equipment Information
- **Voltage Level**: ${currentAlert.stationInfo.voltage}
- **Load Capacity**: ${currentAlert.stationInfo.capacity}
- **Commission Date**: ${currentAlert.stationInfo.commissionDate}
- **Equipment Location**: ${currentAlert.stationInfo.location}

## Maintenance Process
${currentAlert.maintenanceSteps.map((step, index) => `${index + 1}. ${step}`).join("\n")}

## Parts Used
${currentAlert.usedParts}

## Maintenance Results
${maintenanceResult || "Maintenance completed successfully. Equipment restored to normal operation."}

## Additional Notes
${maintenanceNotes || "No additional remarks."}

## Weather Conditions
- **Temperature**: ${currentAlert.weather.temperature}
- **Wind**: ${currentAlert.weather.wind}
- **Weather**: ${currentAlert.weather.condition}
- **Visibility**: ${currentAlert.weather.visibility}

---
*Report generated: ${new Date().toLocaleString("en-GB")}*
    `

    setGeneratedReport(report)
  }

  // Enhanced PDF export function with automatic pagination
  const handleExportPDF = async () => {
    if (!generatedReport) return

    setIsGeneratingPDF(true)

    try {
      // Create new PDF document
      const doc = new jsPDF()
      const pageHeight = doc.internal.pageSize.height
      const pageWidth = doc.internal.pageSize.width
      const margin = 20
      const lineHeight = 6
      let yPosition = 30

      // Helper function to add new page if needed
      const checkPageBreak = (requiredSpace = 15) => {
        if (yPosition + requiredSpace > pageHeight - margin) {
          doc.addPage()
          yPosition = margin
        }
      }

      // Helper function to add text with automatic wrapping and pagination
      const addText = (text: string, fontSize = 10, isBold = false) => {
        doc.setFontSize(fontSize)
        if (isBold) {
          doc.setFont("helvetica", "bold")
        } else {
          doc.setFont("helvetica", "normal")
        }

        const maxWidth = pageWidth - 2 * margin
        const lines = doc.splitTextToSize(text, maxWidth)

        for (let i = 0; i < lines.length; i++) {
          checkPageBreak()
          doc.text(lines[i], margin, yPosition)
          yPosition += lineHeight
        }
      }

      // Helper function to add section spacing
      const addSpacing = (space = 10) => {
        yPosition += space
        checkPageBreak()
      }

      // Document header
      addText("ELECTRICAL SUBSTATION MAINTENANCE REPORT", 18, true)
      addText(`Station #${currentAlert.stationInfo.number}`, 14, true)
      addSpacing(15)

      // Basic Information Section
      addText("BASIC MAINTENANCE INFORMATION", 14, true)
      addSpacing(8)

      const basicInfo = [
        `Station Number: ${currentAlert.stationInfo.number}`,
        `Maintenance Date: ${new Date().toLocaleDateString("en-GB")}`,
        `Technician: John Smith`,
        `Start Time: ${taskStartTime?.toLocaleTimeString("en-GB")}`,
        `End Time: ${taskEndTime?.toLocaleTimeString("en-GB")}`,
        `Duration: ${taskDuration}`,
      ]

      basicInfo.forEach((info) => {
        addText(info, 10)
      })
      addSpacing()

      // Fault Description Section
      addText("FAULT DESCRIPTION", 14, true)
      addSpacing(8)
      addText(currentAlert.message, 10)
      addSpacing()

      // Equipment Information Section
      addText("EQUIPMENT INFORMATION", 14, true)
      addSpacing(8)

      const equipmentInfo = [
        `Voltage Level: ${currentAlert.stationInfo.voltage}`,
        `Load Capacity: ${currentAlert.stationInfo.capacity}`,
        `Commission Date: ${currentAlert.stationInfo.commissionDate}`,
        `Location: ${currentAlert.stationInfo.location}`,
      ]

      equipmentInfo.forEach((info) => {
        addText(info, 10)
      })
      addSpacing()

      // Maintenance Process Section
      addText("MAINTENANCE PROCESS", 14, true)
      addSpacing(8)

      currentAlert.maintenanceSteps.forEach((step, index) => {
        addText(`${index + 1}. ${step}`, 10)
      })
      addSpacing()

      // Parts Used Section
      addText("PARTS USED", 14, true)
      addSpacing(8)
      addText(currentAlert.usedParts, 10)
      addSpacing()

      // Maintenance Results Section
      addText("MAINTENANCE RESULTS", 14, true)
      addSpacing(8)
      const result = maintenanceResult || "Maintenance completed successfully. Equipment restored to normal operation."
      addText(result, 10)
      addSpacing()

      // Additional Notes Section
      addText("ADDITIONAL NOTES", 14, true)
      addSpacing(8)
      const notes = maintenanceNotes || "No additional remarks."
      addText(notes, 10)
      addSpacing()

      // Weather Conditions Section
      addText("WEATHER CONDITIONS", 14, true)
      addSpacing(8)

      const weatherInfo = [
        `Temperature: ${currentAlert.weather.temperature}`,
        `Wind: ${currentAlert.weather.wind}`,
        `Weather: ${currentAlert.weather.condition}`,
        `Visibility: ${currentAlert.weather.visibility}`,
      ]

      weatherInfo.forEach((info) => {
        addText(info, 10)
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
      const fileName = `maintenance-report-${currentAlert.stationInfo.number}-${new Date().toISOString().split("T")[0]}.pdf`

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

  const handleSendMessage = () => {
    if (!currentMessage.trim()) return

    const newMessages = [
      ...chatMessages,
      {
        type: "user",
        message: currentMessage,
        timestamp: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
      },
    ]

    // Simulate AI response
    setTimeout(() => {
      let aiResponse = ""
      if (currentMessage.toLowerCase().includes("broken") || currentMessage.toLowerCase().includes("fault")) {
        aiResponse =
          "Based on sensor data, the equipment shows abnormal current readings. I recommend checking connection lines and fuses. Historical records indicate similar faults are usually caused by poor contact."
      } else if (currentMessage.toLowerCase().includes("check") || currentMessage.toLowerCase().includes("inspect")) {
        aiResponse =
          "Yes, I recommend inspecting that component. Based on equipment runtime and maintenance records, the component may show signs of wear. Please use a multimeter to measure resistance values."
      } else if (currentMessage.toLowerCase().includes("replace")) {
        aiResponse =
          "Equipment C has been operating for 8 years, exceeding the recommended service life (6 years). Replacement is recommended. Spare parts are in stock, model XYZ-2024."
      } else {
        aiResponse =
          "I understand your question. Please provide more detailed information, such as specific fault symptoms, equipment model, or error codes, so I can give more accurate advice."
      }

      setChatMessages((prev) => [
        ...prev,
        {
          type: "ai",
          message: aiResponse,
          timestamp: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
        },
      ])
    }, 1000)

    setChatMessages(newMessages)
    setCurrentMessage("")
  }

  // End task function
  const handleEndTask = () => {
    setIsTaskStarted(false)
    setIsTaskCompleted(false)
    setTaskStartTime(null)
    setTaskEndTime(null)
    setTaskDuration("00:00:00")
    setMaintenanceResult("")
    setMaintenanceNotes("")
    setGeneratedReport(null)
    setShowNotification(true)
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
        {isTaskStarted && (
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
                    <span className="truncate">{currentAlert.stationInfo.location}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Zap className="h-3 w-3 flex-shrink-0" />
                    <span>Substation #{currentAlert.stationInfo.number}</span>
                  </div>
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                    {isTaskCompleted ? "Maintenance Complete" : currentAlert.stationInfo.status}
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
        {showNotification && !isTaskStarted && (
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="preparation" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Pre-Maintenance Preparation
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
          </TabsList>

          {/* Pre-maintenance preparation */}
          <TabsContent value="preparation" className="space-y-6">
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
                      <p className="font-semibold">{currentAlert.stationInfo.number}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Voltage Level</p>
                      <p className="font-semibold">{currentAlert.stationInfo.voltage}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Commission Date</p>
                      <p className="font-semibold">{currentAlert.stationInfo.commissionDate}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Load Capacity</p>
                      <p className="font-semibold">{currentAlert.stationInfo.capacity}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{currentAlert.stationInfo.location}</span>
                  </div>
                  <Badge variant="outline" className="text-green-700 border-green-300">
                    Status: {currentAlert.stationInfo.status}
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
                        <p className="font-semibold">{currentAlert.weather.temperature}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Wind className="h-4 w-4 text-blue-500" />
                      <div>
                        <p className="text-sm text-gray-600">Wind</p>
                        <p className="font-semibold">{currentAlert.weather.wind}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-600">Visibility</p>
                        <p className="font-semibold">{currentAlert.weather.visibility}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Cloud className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-600">Conditions</p>
                        <p className="font-semibold">{currentAlert.weather.condition}</p>
                      </div>
                    </div>
                  </div>
                  <Alert className="mt-4 border-yellow-200 bg-yellow-50">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-800">
                      <strong>Recommendation:</strong> {currentAlert.weather.suggestion}
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
                    {currentAlert.tools.map((tool, index) => (
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
                    {currentAlert.parts.map((part, index) => (
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
                          className={`max-w-[80%] p-3 rounded-lg ${
                            msg.type === "user" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"
                          }`}
                        >
                          <p className="text-sm">{msg.message}</p>
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
            ) : (
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
                            <strong>Substation:</strong> {currentAlert.stationInfo.number}
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
                          {currentAlert.maintenanceSteps.map((step, index) => (
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
                          className={`p-4 rounded-lg border ${
                            isTaskCompleted ? "bg-green-50 border-green-200" : "bg-blue-50 border-blue-200"
                          }`}
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
        </Tabs>
      </div>
    </div>
  )
}
