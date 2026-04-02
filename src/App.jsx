import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import "./App.css";
import { apiRequest, clearTokenMemory, resetUnauthorizedState } from "./utils/api";
import { isTimeoutErrorMessage } from "./utils/requestState";
import MatchScore from "./components/MatchScore";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import JobsSection from "./components/dashboard/JobsSection.jsx";
import ResumeSection from "./components/dashboard/ResumeSection.jsx";
import ApplicationsSection from "./components/dashboard/ApplicationsSection.jsx";
import PreferencesSection from "./components/dashboard/PreferencesSection.jsx";

let pdfjsLibPromise = null;
let jsPdfPromise = null;

async function loadPdfJsLib() {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = import("pdfjs-dist").then((module) => {
      module.GlobalWorkerOptions.workerSrc = pdfWorker;
      return module;
    });
  }

  return pdfjsLibPromise;
}

async function loadJsPdf() {
  if (!jsPdfPromise) {
    jsPdfPromise = import("jspdf").then((module) => module.jsPDF);
  }

  return jsPdfPromise;
}

const SOURCE_SUPPORT_FALLBACK = [
  {
    key: "linkedin",
    name: "LinkedIn",
    market: "Global",
    category: "global",
    searchSupport: "Partner/manual import",
    shortlistSupport: "Supported after normalization",
    autoApplyLabel: "Manual Apply",
    autoApplySupported: false,
    manualActionRequired: true,
    manualActionReason: "LinkedIn flows still require a manual browser submit.",
    status: "active",
  },
  {
    key: "naukri",
    name: "Naukri",
    market: "India",
    category: "india",
    searchSupport: "Adapter-ready",
    shortlistSupport: "Supported",
    autoApplyLabel: "Manual Apply",
    autoApplySupported: false,
    manualActionRequired: true,
    manualActionReason: "Naukri requires manual completion to stay reliable.",
    status: "planned",
  },
  {
    key: "wellfound",
    name: "Wellfound",
    market: "Global",
    category: "global",
    searchSupport: "Adapter-ready",
    shortlistSupport: "Supported",
    autoApplyLabel: "Partial Auto Apply",
    autoApplySupported: true,
    manualActionRequired: false,
    manualActionReason: "Some employer-specific steps may still open externally.",
    status: "planned",
  },
  {
    key: "weworkremotely",
    name: "WeWorkRemotely",
    market: "Global",
    category: "global",
    searchSupport: "Adapter-ready",
    shortlistSupport: "Supported",
    autoApplyLabel: "Manual Apply",
    autoApplySupported: false,
    manualActionRequired: true,
    manualActionReason: "WeWorkRemotely usually redirects to employer flows.",
    status: "planned",
  },
];

const ONBOARDING_STEPS = [
  {
    key: "preferences",
    title: "Setup Preferences",
    description: "Choose roles, locations, work type, and shortlist threshold.",
  },
  {
    key: "resume",
    title: "Upload Resume",
    description: "Save a trusted master resume that powers matching and tailoring.",
  },
  {
    key: "jobs",
    title: "Find Jobs",
    description: "Search, shortlist, prepare assets, and track progress in one place.",
  },
];

const LANDING_TESTIMONIALS = [
  {
    name: "Rahul S.",
    result: "Got 3 interviews in first week",
    quote:
      "I stopped wasting hours on repetitive applications. HireFlow AI handled the grind and I focused on prep.",
    photo: "RS",
  },
  {
    name: "Priya M.",
    result: "Landed a product role in 12 days",
    quote:
      "The resume tailoring felt sharper than anything I was writing myself, and the workflow stayed super clear.",
    photo: "PM",
  },
  {
    name: "Ankit R.",
    result: "Booked 5 recruiter calls in one month",
    quote:
      "The biggest win was consistency. Applications kept moving even when I was offline.",
    photo: "AR",
  },
];

const LANDING_STEPS = [
  { icon: "1", title: "Upload your resume", description: "Drop in your resume once and let HireFlow AI use it as your source of truth." },
  { icon: "2", title: "Set your dream job criteria", description: "Choose titles, locations, work style, and the kinds of roles you actually want." },
  { icon: "3", title: "We apply automatically", description: "Tailored resumes, targeted cover letters, and automated applications keep running in the background." },
];

const LANDING_PRICING = [
  {
    tier: "Free",
    price: "5 applications/month",
    description: "Try the workflow and send a small batch of applications.",
  },
  {
    tier: "Pro",
    price: "₹999/month",
    description: "100 applications + AI tailoring",
    featured: true,
  },
  {
    tier: "Auto",
    price: "₹2499/month",
    description: "Unlimited + recruiter emails",
  },
];

const LANDING_TRUST = ["Secured by Stripe", "Your data is private", "Cancel anytime"];
const DASHBOARD_ROUTE_MAP = {
  "/dashboard": "home",
  "/jobs": "queue",
  "/applications": "applications",
  "/resume": "resume",
  "/cover-letter": "applications",
  "/settings": "settings",
  "/billing": "billing",
};

const CAREER_INTERVIEW_QUESTIONS = [
  {
    key: "biggestAchievement",
    label: "What was your biggest achievement at your last job?",
    placeholder: "Describe the impact, results, and what made it meaningful.",
  },
  {
    key: "flowWork",
    label: "What kind of work makes you lose track of time?",
    placeholder: "Think about projects, problem types, and moments where you feel fully engaged.",
  },
  {
    key: "yesSalary",
    label: "What salary would make you say yes immediately?",
    placeholder: "Share your number or range in the currency you think in naturally.",
  },
  {
    key: "dreamCompanies",
    label: "What companies have you always dreamed of working at?",
    placeholder: "List a few companies or describe the kind of company you admire.",
  },
  {
    key: "strongestSkills",
    label: "What are the strongest hard and soft skills you want to be known for?",
    placeholder: "For example: backend APIs, leadership, debugging, product thinking, mentoring.",
  },
  {
    key: "idealEnvironment",
    label: "What team or company environment brings out your best work?",
    placeholder: "Remote vs office, fast-moving vs structured, startup vs enterprise, mission-driven, etc.",
  },
];

function getStoredToken() {
  try {
    return localStorage.getItem("token") || "";
  } catch {
    return "";
  }
}

function getStoredUser() {
  try {
    const rawUser = localStorage.getItem("user");

    if (!rawUser) {
      return null;
    }

    return JSON.parse(rawUser);
  } catch {
    return null;
  }
}

function removeStoredAuth() {
  try {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  } catch {
    // Ignore storage failures so logout can still continue.
  }
}

function setStoredValue(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore storage failures so the app can still continue.
  }
}

function useToast() {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = "success") => {
    if (!message) {
      return;
    }

    setToast({ message, type });
    window.setTimeout(() => {
      setToast((current) => (current?.message === message && current?.type === type ? null : current));
    }, 3000);
  }, []);

  return { toast, showToast };
}

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showAuthScreen, setShowAuthScreen] = useState(
    () => ["/", "/login", "/register"].includes(window.location.pathname) && !getStoredToken()
  );
  const [authMode, setAuthMode] = useState("login");
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerReferralCode, setRegisterReferralCode] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).get("ref") || "";
    } catch {
      return "";
    }
  });

  const [user, setUser] = useState(null);
  const [appLoading, setAppLoading] = useState(true);
  const [bootLoading, setBootLoading] = useState(true);
  const [bootError, setBootError] = useState("");

  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [tailoredResume, setTailoredResume] = useState("");
  const [resumeMatchScore, setResumeMatchScore] = useState(0);
  const [resumeKeywordsAdded, setResumeKeywordsAdded] = useState([]);
  const [resumeImprovements, setResumeImprovements] = useState([]);
  const [resumeFileName, setResumeFileName] = useState("");
  const [resumeUploadLoading, setResumeUploadLoading] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeError, setResumeError] = useState("");
  const [resumeSuccess, setResumeSuccess] = useState("");

  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [coverLetterDraft, setCoverLetterDraft] = useState("");
  const [coverLetterEditMode, setCoverLetterEditMode] = useState(false);
  const [coverLoading, setCoverLoading] = useState(false);
  const [coverError, setCoverError] = useState("");
  const [coverSuccess, setCoverSuccess] = useState("");

  const [jobRole, setJobRole] = useState("node developer");
  const [jobLocation, setJobLocation] = useState("");
  const [country, setCountry] = useState("in");
  const [workTypes, setWorkTypes] = useState(["remote"]);
  const [preferredRoles, setPreferredRoles] = useState([]);
  const [preferredLocations, setPreferredLocations] = useState([]);
  const [minimumMatchScore, setMinimumMatchScore] = useState(80);
  const [, setPreferencesLoading] = useState(false);
  const [preferencesSaving, setPreferencesSaving] = useState(false);
  const [, setPreferencesMessage] = useState("");
  const [, setPreferencesError] = useState("");
  const [resumeVaultText, setResumeVaultText] = useState("");
  const [, setResumeVaultUpdatedAt] = useState(null);
  const [resumeVaultLoading, setResumeVaultLoading] = useState(false);
  const [resumeVaultSaving, setResumeVaultSaving] = useState(false);
  const [resumeVaultMessage, setResumeVaultMessage] = useState("");
  const [resumeVaultError, setResumeVaultError] = useState("");
  const [activeDashboardTab, setActiveDashboardTab] = useState("home");
  const [, setPrepareMessage] = useState("");
  const [, setPrepareError] = useState("");

  const [, setSearchResults] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [, setSavedJobsLoading] = useState(false);
  const [jobsError, setJobsError] = useState("");
  const [savedJobsError, setSavedJobsError] = useState("");
  const [, setHasSearchedJobs] = useState(false);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [pipelineSummary, setPipelineSummary] = useState(null);
  const [dashboardStatsLoading, setDashboardStatsLoading] = useState(false);
  const [dashboardStatsError, setDashboardStatsError] = useState("");
  const [dashboardStatsMessage, setDashboardStatsMessage] = useState("");
  const [recentApplications, setRecentApplications] = useState([]);
  const [recentApplicationsLoading, setRecentApplicationsLoading] = useState(false);
  const [recentApplicationsError, setRecentApplicationsError] = useState("");
  const [autoApplyLoading, setAutoApplyLoading] = useState(false);
  const [autoApplyMessage, setAutoApplyMessage] = useState("");
  const [autoApplyError, setAutoApplyError] = useState("");
  const [autoAppliedJobs, setAutoAppliedJobs] = useState([]);
  const [applyingJobId, setApplyingJobId] = useState(null);
  const [appliedJobId, setAppliedJobId] = useState(null);
  const [skippingJobId, setSkippingJobId] = useState("");
  const [queueActionMessage, setQueueActionMessage] = useState("");
  const [queueActionError, setQueueActionError] = useState("");
  const [advancedStudioOpen, setAdvancedStudioOpen] = useState(false);
  const [hiddenQueueJobIds, setHiddenQueueJobIds] = useState({});
  const [queueFilter, setQueueFilter] = useState("all");
  const [queueReviewedToday, setQueueReviewedToday] = useState(0);
  const [queueAppliedToday, setQueueAppliedToday] = useState(0);
  const [swipeOffsetX, setSwipeOffsetX] = useState(0);
  const touchStartRef = useRef(null);
  const quickSettingsRef = useRef(null);
  const bootstrapRef = useRef(null);
  const handleMarkAppliedRef = useRef(() => {});
  const handleSkipJobRef = useRef(() => {});
  const handleManualApplyStartRef = useRef(() => {});
  const [applicationStatuses, setApplicationStatuses] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("hireflowApplicationStatuses") || "{}");
    } catch {
      return {};
    }
  });
  const [coverLetterEdits, setCoverLetterEdits] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("hireflowCoverLetterEdits") || "{}");
    } catch {
      return {};
    }
  });
  const [applications, setApplications] = useState([]);
  const [applicationsLoadedOnce, setApplicationsLoadedOnce] = useState(false);
  const [applicationAnalytics, setApplicationAnalytics] = useState(null);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [applicationsError, setApplicationsError] = useState("");
  const [updatingApplicationId, setUpdatingApplicationId] = useState("");
  const [retryingApplicationId, setRetryingApplicationId] = useState("");
  const [applicationRetryMessage, setApplicationRetryMessage] = useState("");
  const [applicationRetryError, setApplicationRetryError] = useState("");
  const [interviewPrepByApplicationId, setInterviewPrepByApplicationId] = useState({});
  const [activeInterviewApplicationId, setActiveInterviewApplicationId] = useState("");
  const [interviewPrepLoadingId, setInterviewPrepLoadingId] = useState("");
  const [interviewPrepRefreshingId, setInterviewPrepRefreshingId] = useState("");
  const [interviewPrepError, setInterviewPrepError] = useState("");
  const [evaluatingInterviewQuestionKey, setEvaluatingInterviewQuestionKey] = useState("");
  const [interviewAnswerDrafts, setInterviewAnswerDrafts] = useState({});
  const [recordingInterviewQuestionKey, setRecordingInterviewQuestionKey] = useState("");
  const [offerStrategyByApplicationId, setOfferStrategyByApplicationId] = useState({});
  const [activeOfferApplicationId, setActiveOfferApplicationId] = useState("");
  const [offerStrategyLoadingId, setOfferStrategyLoadingId] = useState("");
  const [offerStrategyError, setOfferStrategyError] = useState("");
  const [offerDrafts, setOfferDrafts] = useState({});
  const [counterGoalDrafts, setCounterGoalDrafts] = useState({});
  const [offerActionLoadingKey, setOfferActionLoadingKey] = useState("");
  const [referralStats, setReferralStats] = useState(null);
  const [referralLoading, setReferralLoading] = useState(false);
  const [referralError, setReferralError] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [careerInterviewAnswers, setCareerInterviewAnswers] = useState(() =>
    Object.fromEntries(CAREER_INTERVIEW_QUESTIONS.map((item) => [item.key, ""]))
  );
  const [careerDna, setCareerDna] = useState(null);
  const [careerInterviewCompletedAt, setCareerInterviewCompletedAt] = useState(null);
  const [careerInterviewOpen, setCareerInterviewOpen] = useState(false);
  const [careerInterviewStep, setCareerInterviewStep] = useState(0);
  const [careerInterviewLoading, setCareerInterviewLoading] = useState(false);
  const [careerInterviewError, setCareerInterviewError] = useState("");
  const [candidateDiscoveryEnabled, setCandidateDiscoveryEnabled] = useState(false);
  const [candidateDiscoveryHeadline, setCandidateDiscoveryHeadline] = useState("");
  const [connections, setConnections] = useState([]);
  const [connectionsLoading, setConnectionsLoading] = useState(false);
  const [connectionsError, setConnectionsError] = useState("");
  const [sourceCatalog, setSourceCatalog] = useState(SOURCE_SUPPORT_FALLBACK);
  const [sourceCatalogLoading, setSourceCatalogLoading] = useState(false);
  const [sourceCatalogError, setSourceCatalogError] = useState("");
  const { toast, showToast } = useToast();
  const hasStoredToken = Boolean(getStoredToken());
  const appliedJobReferenceSet = useMemo(
    () =>
      new Set(
        applications
          .flatMap((item) => [item?.job, item?.jobId])
          .map((value) => String(value || "").trim())
          .filter(Boolean)
      ),
    [applications]
  );
  const jobsById = useMemo(
    () =>
      Object.fromEntries(
        savedJobs
          .filter((job) => job?._id)
          .map((job) => [String(job._id), job])
      ),
    [savedJobs]
  );
  const activeSavedJobs = useMemo(
    () =>
      savedJobs.filter((job) => {
        if (job?.skipped) {
          return false;
        }

        const candidates = [job?._id, job?.jobId].map((value) => String(value || "").trim()).filter(Boolean);
        const appliedFromApplications = candidates.some((candidate) => appliedJobReferenceSet.has(candidate));

        if (appliedFromApplications) {
          return false;
        }

        return applicationsLoadedOnce ? !appliedFromApplications : false;
      }),
    [appliedJobReferenceSet, applicationsLoadedOnce, savedJobs]
  );
  const jobBuckets = useMemo(() => {
    const matched = [];
    const manual = [];
    const ready = [];

    for (const job of activeSavedJobs) {
      if (isManualActionJob(job)) {
        manual.push(job);
      } else if (isReadyToApplyJob(job)) {
        ready.push(job);
      } else {
        matched.push(job);
      }
    }

    return { matched, manual, ready };
  }, [activeSavedJobs]);
  const matchedJobs = jobBuckets.matched;
  const manualJobs = jobBuckets.manual;
  const readyJobs = jobBuckets.ready;
  const queuedJobs = useMemo(
    () => [...manualJobs, ...readyJobs, ...matchedJobs].slice(0, 12),
    [manualJobs, matchedJobs, readyJobs]
  );
  const visibleQueuedJobs = useMemo(
    () => queuedJobs.filter((job) => !hiddenQueueJobIds[job._id]),
    [hiddenQueueJobIds, queuedJobs]
  );
  const filteredQueuedJobs = useMemo(() => {
    if (queueFilter === "all") {
      return visibleQueuedJobs;
    }

    return visibleQueuedJobs.filter((job) => getJobWorkMode(job).toLowerCase() === queueFilter);
  }, [queueFilter, visibleQueuedJobs]);
  const queueStackJobs = useMemo(() => filteredQueuedJobs.slice(0, 3), [filteredQueuedJobs]);
  const activeQueueJob = queueStackJobs[0] || null;
  const queueTotalToday = queueReviewedToday + visibleQueuedJobs.length;
  const queueProgressLabel = `${Math.min(queueReviewedToday, queueTotalToday)} of ${queueTotalToday} jobs reviewed today`;
  const queueProgressPercent = queueTotalToday ? Math.min(100, queueReviewedToday / queueTotalToday * 100) : 100;
  const planLimit = getPlanApplicationLimit(user?.plan);

  useEffect(() => {
    setStoredValue("savedResumeText", resumeText);
  }, [resumeText]);

  useEffect(() => {
    setStoredValue("hireflowApplicationStatuses", JSON.stringify(applicationStatuses));
  }, [applicationStatuses]);

  useEffect(() => {
    setStoredValue("hireflowCoverLetterEdits", JSON.stringify(coverLetterEdits));
  }, [coverLetterEdits]);

  useEffect(() => {
    const syncReferralCodeFromUrl = () => {
      try {
        const nextCode = new URLSearchParams(window.location.search).get("ref") || "";
        setRegisterReferralCode(nextCode);

        if (nextCode && !localStorage.getItem("token")) {
          setAuthMode("register");
          setShowAuthScreen(true);
        }
      } catch {
        setRegisterReferralCode("");
      }
    };

    syncReferralCodeFromUrl();
    window.addEventListener("popstate", syncReferralCodeFromUrl);

    return () => {
      window.removeEventListener("popstate", syncReferralCodeFromUrl);
    };
  }, []);

  const showLoginScreen = useCallback((message = "") => {
    setUser(null);
    setReferralStats(null);
    setInviteMessage("");
    setCareerDna(null);
    setCareerInterviewCompletedAt(null);
    setCareerInterviewOpen(false);
    setShowAuthScreen(true);
    setBootError("");
    setBootLoading(false);
    setDashboardStats(null);
    setPipelineSummary(null);
    setSavedJobs([]);
    setSearchResults([]);
    setApplications([]);
    setApplicationsLoadedOnce(false);
    setInterviewPrepByApplicationId({});
    setActiveInterviewApplicationId("");
    setOfferStrategyByApplicationId({});
    setActiveOfferApplicationId("");
    setConnections([]);
    setAuthMessage(message);
    navigate("/login", { replace: true });
  }, [navigate]);

  const clearAuthAndRedirect = useCallback(() => {
    clearTokenMemory();
    removeStoredAuth();
    try {
      sessionStorage.clear();
    } catch {
      // Ignore session storage failures so auth recovery still works.
    }
    showLoginScreen("Your session expired. Please log in again.");
  }, [showLoginScreen]);

  useEffect(() => {
    const handleUnauthorized = () => {
      showLoginScreen("Your session expired. Please log in again.");
    };

    window.addEventListener("hireflow:unauthorized", handleUnauthorized);

    return () => {
      window.removeEventListener("hireflow:unauthorized", handleUnauthorized);
    };
  }, [showLoginScreen]);

  useEffect(() => {
    const handleApiError = (event) => {
      const message = event?.detail?.message || "Something went wrong. Please try again.";
      showToast(message, "error");
    };

    const handleOffline = () => {
      showToast("No internet connection", "error");
    };

    const handleOnline = () => {
      showToast("Back online", "success");
    };

    window.addEventListener("hireflow:api-error", handleApiError);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("hireflow:api-error", handleApiError);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [showToast]);

  const loadStoredJobs = useCallback(async () => {
    try {
      setSavedJobsLoading(true);
      setSavedJobsError("");

      const data = await apiRequest("/api/jobs/stored", {
        method: "GET",
        suppressGlobalError: true,
      });

      const nextJobs = Array.isArray(data?.jobs) ? data.jobs : [];
      setSavedJobs(nextJobs);
      setHiddenQueueJobIds((prev) => {
        if (!Object.keys(prev).length) {
          return prev;
        }

        const serverSkippedOrAppliedIds = new Set(
          nextJobs
            .filter((job) => {
              if (job?.skipped) {
                return true;
              }

              const candidates = [job?._id, job?.jobId].map((value) => String(value || "").trim()).filter(Boolean);
              const appliedFromApplications = candidates.some((candidate) => appliedJobReferenceSet.has(candidate));

              return appliedFromApplications;
            })
            .flatMap((job) => [job?._id, job?.jobId].map((value) => String(value || "").trim()).filter(Boolean))
        );

        return Object.fromEntries(
          Object.entries(prev).filter(([jobId]) => !serverSkippedOrAppliedIds.has(jobId))
        );
      });
    } catch (error) {
      setSavedJobsError(error.message || "Failed to load saved jobs.");
    } finally {
      setSavedJobsLoading(false);
    }
  }, [appliedJobReferenceSet]);

  const loadDashboardStats = useCallback(async () => {
    try {
      setDashboardStatsLoading(true);
      setDashboardStatsError("");
      setDashboardStatsMessage("Refreshing dashboard metrics...");

      const [statsData, summaryData] = await Promise.all([
        apiRequest("/api/stats/me", {
          method: "GET",
          suppressGlobalError: true,
        }),
        apiRequest("/api/stats/pipeline-summary", {
          method: "GET",
          suppressGlobalError: true,
        }),
      ]);

      setDashboardStats(statsData?.stats || null);
      setPipelineSummary(summaryData?.summary || null);
      setDashboardStatsMessage("Dashboard metrics are up to date.");
    } catch (error) {
      if (error?.status === 404) {
        setDashboardStats(null);
        setPipelineSummary(null);
        setDashboardStatsError("");
        setDashboardStatsMessage("");
        return;
      }

      setDashboardStats(null);
      setPipelineSummary(null);
      setDashboardStatsError(error.message || "Failed to load dashboard stats.");
      setDashboardStatsMessage("");
    } finally {
      setDashboardStatsLoading(false);
    }
  }, []);

  const loadRecentApplications = useCallback(async () => {
    try {
      setRecentApplicationsLoading(true);
      setRecentApplicationsError("");

      const data = await apiRequest("/api/applications/recent", {
        method: "GET",
        suppressGlobalError: true,
      });

      setRecentApplications(Array.isArray(data?.applications) ? data.applications : []);
    } catch (error) {
      if (error?.status === 404) {
        setRecentApplications([]);
        setRecentApplicationsError("");
        return;
      }

      setRecentApplications([]);
      setRecentApplicationsError(error.message || "Failed to load recent applications.");
    } finally {
      setRecentApplicationsLoading(false);
    }
  }, []);

  function markQueueJobHidden(jobId) {
    setHiddenQueueJobIds((prev) => ({ ...prev, [jobId]: true }));
    setSavedJobs((prev) => prev.filter((job) => job._id !== jobId));
    setSearchResults((prev) => prev.filter((job) => job._id !== jobId));
  }

  function recordQueueReview(action) {
    setQueueReviewedToday((prev) => prev + 1);
    if (action === "apply") {
      setQueueAppliedToday((prev) => prev + 1);
    }
  }

  function goToDashboardTab(tab) {
    const path =
      tab === "home"
        ? "/dashboard"
        : tab === "queue"
          ? "/jobs"
          : tab === "applications"
            ? "/applications"
            : tab === "resume"
              ? "/resume"
            : tab === "settings"
                ? "/settings"
              : tab === "billing"
                  ? "/billing"
                    : "/dashboard";

    setActiveDashboardTab(tab);
    navigate(path);
  }

  const retryDashboardHome = useCallback(async () => {
    await Promise.all([loadDashboardStats(), loadRecentApplications()]);
  }, [loadDashboardStats, loadRecentApplications]);

  const loadApplications = useCallback(async () => {
    try {
      setApplicationsLoading(true);
      setApplicationsError("");

      const data = await apiRequest("/api/applications/me", {
        method: "GET",
        suppressGlobalError: true,
      });

      const nextApplications = Array.isArray(data?.applications) ? data.applications : [];
      setApplications(nextApplications);
      setApplicationAnalytics(data?.analytics || null);
      setApplicationStatuses((prev) => {
        const next = { ...prev };
        for (const item of nextApplications) {
          if (item?.job) {
            next[item.job] = item.lifecycleStatus || "Applied";
          }
        }
        return next;
      });
    } catch (error) {
      setApplicationsError(error.message || "Failed to load applications.");
    } finally {
      setApplicationsLoading(false);
      setApplicationsLoadedOnce(true);
    }
  }, []);

  useEffect(() => {
    if (!user?._id || activeDashboardTab !== "applications") {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      loadApplications();
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [activeDashboardTab, loadApplications, user?._id]);

  const loadInterviewPrep = useCallback(async (applicationId, options = {}) => {
    const { force = false } = options;

    try {
      if (force) {
        setInterviewPrepRefreshingId(applicationId);
      } else {
        setInterviewPrepLoadingId(applicationId);
      }
      setInterviewPrepError("");

      const data = force
        ? await apiRequest(`/api/applications/${applicationId}/interview-prep/prepare`, {
            method: "POST",
            body: JSON.stringify({
              force: true,
            }),
          })
        : await apiRequest(`/api/applications/${applicationId}/interview-prep`, {
            method: "GET",
          });

      if (data?.interviewPrep) {
        setInterviewPrepByApplicationId((prev) => ({
          ...prev,
          [applicationId]: data.interviewPrep,
        }));
      }

      return data?.interviewPrep || null;
    } catch (error) {
      if (!force && error.status === 404) {
        try {
          const data = await apiRequest(`/api/applications/${applicationId}/interview-prep/prepare`, {
            method: "POST",
            body: JSON.stringify({}),
          });

          if (data?.interviewPrep) {
            setInterviewPrepByApplicationId((prev) => ({
              ...prev,
              [applicationId]: data.interviewPrep,
            }));
          }

          return data?.interviewPrep || null;
        } catch (prepareError) {
          setInterviewPrepError(prepareError.message || "Failed to generate interview prep.");
          return null;
        }
      }

      setInterviewPrepError(error.message || "Failed to load interview prep.");
      return null;
    } finally {
      setInterviewPrepLoadingId((prev) => (prev === applicationId ? "" : prev));
      setInterviewPrepRefreshingId((prev) => (prev === applicationId ? "" : prev));
    }
  }, []);

  const loadOfferStrategy = useCallback(async (applicationId, options = {}) => {
    const { force = false, offerAmount } = options;

    try {
      setOfferStrategyLoadingId(applicationId);
      setOfferStrategyError("");

      const data = force || offerAmount
        ? await apiRequest(`/api/applications/${applicationId}/offer-negotiation/prepare`, {
            method: "POST",
            body: JSON.stringify({
              force,
              offerAmount,
              currency: "INR",
            }),
          })
        : await apiRequest(`/api/applications/${applicationId}/offer-negotiation`, {
            method: "GET",
          });

      if (data?.offerNegotiation) {
        setOfferStrategyByApplicationId((prev) => ({
          ...prev,
          [applicationId]: data.offerNegotiation,
        }));
      }

      return data?.offerNegotiation || null;
    } catch (error) {
      if (!force && error.status === 404 && offerAmount) {
        try {
          const data = await apiRequest(`/api/applications/${applicationId}/offer-negotiation/prepare`, {
            method: "POST",
            body: JSON.stringify({
              offerAmount,
              currency: "INR",
            }),
          });

          if (data?.offerNegotiation) {
            setOfferStrategyByApplicationId((prev) => ({
              ...prev,
              [applicationId]: data.offerNegotiation,
            }));
          }

          return data?.offerNegotiation || null;
        } catch (prepareError) {
          setOfferStrategyError(prepareError.message || "Failed to prepare offer strategy.");
          return null;
        }
      }

      if (!force && error.status === 404) {
        return null;
      }

      setOfferStrategyError(error.message || "Failed to load offer strategy.");
      return null;
    } finally {
      setOfferStrategyLoadingId((prev) => (prev === applicationId ? "" : prev));
    }
  }, []);

  const loadReferralStats = useCallback(async () => {
    try {
      setReferralLoading(true);
      setReferralError("");

      const data = await apiRequest("/api/referrals/me", {
        method: "GET",
        suppressGlobalError: true,
      });

      setReferralStats(data?.stats || null);
    } catch (error) {
      setReferralError(error.message || "Failed to load referrals.");
    } finally {
      setReferralLoading(false);
    }
  }, []);

  const loadSourceCatalog = useCallback(async () => {
    try {
      setSourceCatalogLoading(true);
      setSourceCatalogError("");

      const data = await apiRequest("/api/jobs/sources", {
        method: "GET",
        suppressGlobalError: true,
      });

      if (Array.isArray(data?.sources) && data.sources.length) {
        setSourceCatalog(data.sources);
      }
    } catch (error) {
      setSourceCatalogError(error.message || "Failed to load source catalog.");
    } finally {
      setSourceCatalogLoading(false);
    }
  }, []);

  const loadConnections = useCallback(async () => {
    try {
      setConnectionsLoading(true);
      setConnectionsError("");

      const data = await apiRequest("/api/preferences/connections", {
        method: "GET",
        suppressGlobalError: true,
      });

      setConnections(Array.isArray(data?.items) ? data.items : []);
    } catch (error) {
      setConnectionsError(error.message || "Failed to load referral connections.");
    } finally {
      setConnectionsLoading(false);
    }
  }, []);

  const loadPreferences = useCallback(async () => {
    try {
      setPreferencesLoading(true);
      setPreferencesError("");

      const data = await apiRequest("/api/preferences/me", {
        method: "GET",
        suppressGlobalError: true,
      });

      const nextPreference = data?.preference || {};
      const nextRoles = Array.isArray(nextPreference.preferredRoles)
        ? nextPreference.preferredRoles
        : [];
      const nextLocations = Array.isArray(nextPreference.preferredLocations)
        ? nextPreference.preferredLocations
        : [];
      const nextWorkTypes = Array.isArray(nextPreference.workTypes) && nextPreference.workTypes.length
        ? nextPreference.workTypes
        : ["remote"];

      setPreferredRoles(nextRoles);
      setPreferredLocations(nextLocations);
      setWorkTypes(nextWorkTypes);
      setCountry(nextPreference.country || "in");
      setMinimumMatchScore(Number(nextPreference.minimumMatchScore) || 80);
      setJobRole(nextRoles.join(", "));
      setJobLocation(nextLocations.join(", "));
      setCareerDna(nextPreference.careerDna || null);
      setCareerInterviewCompletedAt(nextPreference.careerInterviewCompletedAt || null);
      setCareerInterviewAnswers({
        biggestAchievement: nextPreference.careerInterviewAnswers?.biggestAchievement || "",
        flowWork: nextPreference.careerInterviewAnswers?.flowWork || "",
        yesSalary: nextPreference.careerInterviewAnswers?.yesSalary || "",
        dreamCompanies: nextPreference.careerInterviewAnswers?.dreamCompanies || "",
        strongestSkills: nextPreference.careerInterviewAnswers?.strongestSkills || "",
        idealEnvironment: nextPreference.careerInterviewAnswers?.idealEnvironment || "",
      });
      setCareerInterviewOpen(!nextPreference.careerInterviewCompletedAt);
      setCandidateDiscoveryEnabled(Boolean(nextPreference.candidateDiscovery?.enabled));
      setCandidateDiscoveryHeadline(nextPreference.candidateDiscovery?.headline || "");
    } catch (error) {
      setPreferencesError(error.message || "Failed to load preferences.");
    } finally {
      setPreferencesLoading(false);
    }
  }, []);

  const loadResumeVault = useCallback(async () => {
    try {
      setResumeVaultLoading(true);
      setResumeVaultError("");

      const data = await apiRequest("/api/resume-vault/me", {
        method: "GET",
        suppressGlobalError: true,
      });

      const nextResume = data?.resume || {};
      setResumeVaultText(nextResume.text || "");
      setResumeVaultUpdatedAt(nextResume.updatedAt || null);

      if (!resumeText && nextResume.text) {
        setResumeText(nextResume.text);
      }
    } catch (error) {
      setResumeVaultError(error.message || "Failed to load resume vault.");
    } finally {
      setResumeVaultLoading(false);
    }
  }, [resumeText]);

  const refreshOperationalData = useCallback(async () => {
    await Promise.allSettled([
      loadApplications(),
      loadStoredJobs(),
      loadDashboardStats(),
      loadRecentApplications(),
    ]);
  }, [loadApplications, loadDashboardStats, loadRecentApplications, loadStoredJobs]);

  const hydrateDashboardData = useCallback(() => {
    void Promise.allSettled([
      loadStoredJobs(),
      loadApplications(),
      loadDashboardStats(),
      loadRecentApplications(),
      loadPreferences(),
      loadResumeVault(),
    ]);
  }, [
    loadApplications,
    loadDashboardStats,
    loadPreferences,
    loadRecentApplications,
    loadResumeVault,
    loadStoredJobs,
  ]);

  const bootstrap = useCallback(async () => {
    try {
      setBootLoading(true);
      setBootError("");

      const data = await apiRequest("/api/auth/me", { method: "GET" });
      const nextUser = data?.user || null;

      if (!nextUser) {
        clearAuthAndRedirect();
        return;
      }

      setUser(nextUser);
      setStoredValue("user", JSON.stringify(nextUser));
      hydrateDashboardData();
    } catch (error) {
      if (error?.status === 401) {
        clearAuthAndRedirect();
        return;
      }

      setBootError(error.message || "Failed to load app.");
    } finally {
      setBootLoading(false);
    }
  }, [clearAuthAndRedirect, hydrateDashboardData]);

  useEffect(() => {
    bootstrapRef.current = bootstrap;
  }, [bootstrap]);

  useEffect(() => {
    let isMounted = true;

    async function startApp() {
      let savedResume = "";
      try {
        savedResume = localStorage.getItem("savedResumeText") || "";
      } catch {
        savedResume = "";
      }
      if (savedResume) {
        setResumeText(savedResume);
      }

      const storedToken = getStoredToken();
      const storedUser = getStoredUser();

      if (storedToken && storedUser && isMounted) {
        setUser(storedUser);
      }

      if (!storedToken) {
        if (isMounted) {
          setBootLoading(false);
          setAppLoading(false);
        }
        return;
      }

      try {
        await bootstrapRef.current?.();
      } finally {
        if (isMounted) {
          setAppLoading(false);
        }
      }
    }

    startApp();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!user?._id || activeDashboardTab !== "settings") {
      return;
    }

    if (!referralStats && !referralLoading) {
      void loadReferralStats();
    }

    if ((!sourceCatalog.length || sourceCatalog === SOURCE_SUPPORT_FALLBACK) && !sourceCatalogLoading) {
      void loadSourceCatalog();
    }

    if (!connections.length && !connectionsLoading) {
      void loadConnections();
    }
  }, [
    activeDashboardTab,
    connections.length,
    connectionsLoading,
    loadConnections,
    loadReferralStats,
    loadSourceCatalog,
    referralLoading,
    referralStats,
    sourceCatalog,
    sourceCatalogLoading,
    user?._id,
  ]);

  useEffect(() => {
    const path = location.pathname;
    const isPublicPath = path === "/" || path === "/login" || path === "/register";

    setShowAuthScreen(isPublicPath);

    if (path === "/login") {
      setAuthMode("login");
      return;
    }

    if (path === "/register" || path === "/") {
      setAuthMode("register");
      return;
    }

    const nextTab = DASHBOARD_ROUTE_MAP[path];
    if (nextTab) {
      setActiveDashboardTab(nextTab);
    }
  }, [location.pathname]);

  useEffect(() => {
    setSwipeOffsetX(0);
    touchStartRef.current = null;
  }, [activeQueueJob?._id]);

  useEffect(() => {
    if (showAuthScreen || activeDashboardTab !== "queue" || !activeQueueJob) {
      return undefined;
    }

    function isEditableTarget(target) {
      if (!(target instanceof HTMLElement)) {
        return false;
      }

      const tagName = target.tagName;
      return target.isContentEditable || tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT";
    }

    function openQueueJobDetails() {
      const jobLink = activeQueueJob.applyUrl || activeQueueJob.jobUrl;

      if (jobLink) {
        window.open(jobLink, "_blank", "noopener,noreferrer");
      }
    }

    function handleQueueKeydown(event) {
      if (isEditableTarget(event.target)) {
        return;
      }

      if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
        event.preventDefault();
        handleSkipJobRef.current(activeQueueJob._id);
      }

      if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
        event.preventDefault();
        if (isManualActionJob(activeQueueJob) && !activeQueueJob.manualApplyInProgress) {
          handleManualApplyStartRef.current(activeQueueJob);
          return;
        }

        handleMarkAppliedRef.current(activeQueueJob);
      }

      if (event.code === "Space") {
        event.preventDefault();
        openQueueJobDetails();
      }
    }

    window.addEventListener("keydown", handleQueueKeydown);
    return () => window.removeEventListener("keydown", handleQueueKeydown);
  }, [activeDashboardTab, activeQueueJob, showAuthScreen]);

  async function handleLogin() {
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setAuthMessage("Enter email and password.");
      return;
    }

    try {
      setAuthLoading(true);
      setAuthMessage("");

      const data = await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: loginEmail.trim(),
          password: loginPassword,
        }),
      });

      if (!data?.token || !data?.user) {
        throw new Error("Login response missing token or user.");
      }

      setStoredValue("token", data.token);
      setStoredValue("user", JSON.stringify(data.user));
      resetUnauthorizedState();
      setUser(data.user);
      setShowAuthScreen(false);
      setAuthMessage("Login successful. Loading your dashboard...");
      setBootError("");
      setBootLoading(false);
      navigate("/dashboard", { replace: true });
      hydrateDashboardData();
    } catch (error) {
      setAuthMessage(error.message || "Login failed.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleRegister() {
    if (!registerName.trim() || !registerEmail.trim() || !registerPassword.trim()) {
      setAuthMessage("Enter name, email, and password.");
      return;
    }

    try {
      setAuthLoading(true);
      setAuthMessage("");

      const data = await apiRequest("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: registerName.trim(),
          email: registerEmail.trim(),
          password: registerPassword,
          referralCode: registerReferralCode.trim() || undefined,
        }),
      });

      if (!data?.token || !data?.user) {
        throw new Error("Register response missing token or user.");
      }

      setStoredValue("token", data.token);
      setStoredValue("user", JSON.stringify(data.user));
      resetUnauthorizedState();
      setUser(data.user);
      setShowAuthScreen(false);
      setAuthMessage("Account created. Loading your dashboard...");
      setBootError("");
      setBootLoading(false);
      navigate("/dashboard", { replace: true });
      setRegisterReferralCode("");
      hydrateDashboardData();
    } catch (error) {
      setAuthMessage(error.message || "Registration failed.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleResumeTailor() {
    try {
      setResumeLoading(true);
      setResumeError("");
      setResumeSuccess("");
      setTailoredResume("");
      setResumeMatchScore(0);
      setResumeKeywordsAdded([]);
      setResumeImprovements([]);

      if (!resumeText.trim() || !jobDescription.trim()) {
        setResumeError("Please fill both Resume Text and Job Description.");
        return;
      }

      const data = await apiRequest("/api/resume-tailor", {
        method: "POST",
        body: JSON.stringify({
          resumeText,
          resume: resumeText,
          jobDescription,
        }),
      });
      const rawOutput = data?.tailoredResume ?? data?.result?.tailoredResume ?? data?.result ?? "";
      const output =
        typeof rawOutput === "string"
          ? rawOutput
          : rawOutput && typeof rawOutput === "object"
            ? String(
                rawOutput.tailoredResume ||
                rawOutput.text ||
                rawOutput.content ||
                rawOutput.body ||
                ""
              ).trim()
            : String(rawOutput || "");
      const nextScore = Number(data?.matchScore ?? data?.result?.matchScore ?? 0);
      const nextKeywords = Array.isArray(data?.keywordsAdded)
        ? data.keywordsAdded
        : Array.isArray(data?.result?.keywordsAdded)
          ? data.result.keywordsAdded
          : [];
      const responseImprovements = Array.isArray(data?.improvements)
        ? data.improvements
        : Array.isArray(data?.improvementSummary)
          ? data.improvementSummary
          : Array.isArray(data?.result?.improvementSummary)
            ? data.result.improvementSummary
            : [];
      const nextImprovements = Array.isArray(data?.improvementSummary)
        ? data.improvementSummary
        : Array.isArray(data?.result?.improvementSummary)
          ? data.result.improvementSummary
          : responseImprovements;

      if (!output) {
        setResumeError("API returned no resume text.");
        setTailoredResume("");
        return;
      }

      setTailoredResume(output);
      setResumeMatchScore(nextScore);
      setResumeKeywordsAdded(nextKeywords);
      setResumeImprovements(nextImprovements);
      setResumeSuccess("Tailored resume ready to review.");
    } catch (error) {
      setResumeError(error.message || "Failed to tailor resume.");
      setResumeSuccess("");
    } finally {
      setResumeLoading(false);
    }
  }

  async function handleResumeUpload(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      setResumeUploadLoading(true);
      setResumeError("");
      setResumeFileName(file.name);

      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        const pdfjsLib = await loadPdfJsLib();
        const buffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
        let text = "";

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          const page = await pdf.getPage(pageNumber);
          const content = await page.getTextContent();
          const pageText = content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
          text += `${pageText}\n\n`;
        }

        setResumeText(text.trim());
      } else {
        const fileText = await file.text();
        setResumeText(fileText);
      }
    } catch {
      setResumeError("Failed to read the uploaded resume file.");
    } finally {
      setResumeUploadLoading(false);
      event.target.value = "";
    }
  }

  async function handleDownloadTailoredResumePdf() {
    if (!tailoredResume.trim()) {
      return;
    }

    const JsPdf = await loadJsPdf();
    const doc = new JsPdf({
      unit: "pt",
      format: "a4",
    });
    const margin = 40;
    const pageWidth = doc.internal.pageSize.getWidth() - margin * 2;
    const lines = doc.splitTextToSize(tailoredResume, pageWidth);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Tailored Resume", margin, margin);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    let y = margin + 28;

    for (const line of lines) {
      if (y > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        y = margin;
      }

      doc.text(line, margin, y);
      y += 14;
    }

    doc.save(`${sanitizeFilename(resumeFileName || "tailored-resume") || "tailored-resume"}.pdf`);
  }

  async function handleDownloadCoverLetterPdf() {
    const coverLetterText = String(coverLetterDraft || coverLetter || "").trim();

    if (!coverLetterText) {
      return;
    }

    const JsPdf = await loadJsPdf();
    const doc = new JsPdf({
      unit: "pt",
      format: "a4",
    });
    const margin = 40;
    const pageWidth = doc.internal.pageSize.getWidth() - margin * 2;
    const lines = doc.splitTextToSize(coverLetterText, pageWidth);

    doc.setFont("times", "bold");
    doc.setFontSize(16);
    doc.text("Cover Letter", margin, margin);
    doc.setFont("times", "normal");
    doc.setFontSize(11);

    let y = margin + 28;

    for (const line of lines) {
      if (y > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        y = margin;
      }

      doc.text(line, margin, y);
      y += 16;
    }

    doc.save(`${sanitizeFilename(`${companyName || "cover-letter"}-${jobTitle || "draft"}`) || "cover-letter"}.pdf`);
  }

  async function handleSavePreferences() {
    try {
      setPreferencesSaving(true);
      setPreferencesError("");
      setPreferencesMessage("");

      const data = await apiRequest("/api/preferences/me", {
        method: "PUT",
        body: JSON.stringify({
          preferredRoles,
          preferredLocations,
          workTypes,
          country,
          minimumMatchScore,
          candidateDiscovery: {
            enabled: candidateDiscoveryEnabled,
            headline: candidateDiscoveryHeadline,
          },
        }),
      });

      const nextPreference = data?.preference || {};
      setPreferredRoles(nextPreference.preferredRoles || []);
      setPreferredLocations(nextPreference.preferredLocations || []);
      setWorkTypes(nextPreference.workTypes || ["remote"]);
      setCountry(nextPreference.country || "in");
      setMinimumMatchScore(Number(nextPreference.minimumMatchScore) || 80);
      setCandidateDiscoveryEnabled(Boolean(nextPreference.candidateDiscovery?.enabled));
      setCandidateDiscoveryHeadline(nextPreference.candidateDiscovery?.headline || "");
      setJobRole((nextPreference.preferredRoles || []).join(", "));
      setJobLocation((nextPreference.preferredLocations || []).join(", "));
      setPreferencesMessage(data?.message || "Preferences saved.");

    } catch (error) {
      setPreferencesError(error.message || "Failed to save preferences.");
    } finally {
      setPreferencesSaving(false);
    }
  }

  async function handleSaveCareerInterview() {
    try {
      setCareerInterviewLoading(true);
      setCareerInterviewError("");

      const data = await apiRequest("/api/preferences/career-dna", {
        method: "POST",
        body: JSON.stringify(careerInterviewAnswers),
      });

      const nextPreference = data?.preference || {};
      const nextCareerDna = data?.careerDna || nextPreference.careerDna || null;

      setCareerDna(nextCareerDna);
      setCareerInterviewCompletedAt(nextPreference.careerInterviewCompletedAt || new Date().toISOString());
      setCareerInterviewOpen(false);
      await loadPreferences();
    } catch (error) {
      setCareerInterviewError(error.message || "Failed to create Career DNA profile.");
    } finally {
      setCareerInterviewLoading(false);
    }
  }

  async function handleSaveResumeVault() {
    try {
      setResumeVaultSaving(true);
      setResumeVaultError("");
      setResumeVaultMessage("");

      const data = await apiRequest("/api/resume-vault/me", {
        method: "PUT",
        body: JSON.stringify({
          resumeText: resumeVaultText,
        }),
      });

      setResumeVaultText(data?.resume?.text || "");
      setResumeVaultUpdatedAt(data?.resume?.updatedAt || null);
      setResumeText(data?.resume?.text || "");
      setResumeVaultMessage(data?.message || "Master resume saved.");
    } catch (error) {
      setResumeVaultError(error.message || "Failed to save master resume.");
    } finally {
      setResumeVaultSaving(false);
    }
  }

  async function handleDeleteResumeVault() {
    const confirmed = window.confirm("Delete your saved master resume? This cannot be undone.");

    if (!confirmed) {
      return;
    }

    try {
      setResumeVaultSaving(true);
      setResumeVaultError("");
      setResumeVaultMessage("");

      const data = await apiRequest("/api/resume-vault/me", {
        method: "DELETE",
      });

      setResumeVaultText("");
      setResumeVaultUpdatedAt(null);
      setResumeText("");
      setResumeVaultMessage(data?.message || "Master resume deleted.");
    } catch (error) {
      setResumeVaultError(error.message || "Failed to delete master resume.");
    } finally {
      setResumeVaultSaving(false);
    }
  }

  async function handleCoverLetterGenerate() {
    try {
      setCoverLoading(true);
      setCoverError("");
      setCoverSuccess("");
      setCoverLetter("");
      setCoverLetterDraft("");
      setCoverLetterEditMode(false);

      if (!resumeText.trim() || !jobDescription.trim()) {
        setCoverError("Please fill Resume Text and Job Description.");
        return;
      }

      const data = await apiRequest("/api/cover-letter", {
        method: "POST",
        body: JSON.stringify({
          resumeText,
          resume: resumeText,
          jobDescription,
          companyName,
          company: companyName,
          jobTitle,
        }),
      });
      const rawOutput =
        data?.coverLetter ??
        data?.result?.coverLetter ??
        data?.content ??
        data?.result ??
        "";
      const output =
        typeof rawOutput === "string"
          ? rawOutput
          : rawOutput && typeof rawOutput === "object"
            ? String(rawOutput.coverLetter || rawOutput.content || JSON.stringify(rawOutput, null, 2))
            : String(rawOutput || "");

      if (!output) {
        setCoverError("API returned no cover letter text.");
        setCoverLetter(JSON.stringify(data, null, 2));
        return;
      }

      setCoverLetter(output);
      setCoverLetterDraft(output);
      setCoverSuccess("Cover letter ready to review.");
    } catch (error) {
      setCoverError(error.message || "Failed to generate cover letter.");
      setCoverSuccess("");
    } finally {
      setCoverLoading(false);
    }
  }

  async function handleJobsSearch() {
    try {
      setJobsLoading(true);
      setJobsError("");
      setSearchResults([]);
      setHasSearchedJobs(true);

      const data = await apiRequest("/api/jobs/search", {
        method: "POST",
        body: JSON.stringify({
          search: preferredRoles.join(", ") || jobRole,
          location: preferredLocations.join(", ") || jobLocation,
          country,
          remoteOnly: workTypes.length === 1 && workTypes[0] === "remote",
          workTypes,
          minimumMatchScore,
        }),
      });
      const nextJobs = Array.isArray(data?.jobs) ? data.jobs : [];
      setSearchResults(nextJobs);
      await loadStoredJobs();
    } catch (error) {
      setJobsError(error.message || "Failed to search jobs.");
    } finally {
      setJobsLoading(false);
    }
  }

  async function handleAutoApplyNow() {
    try {
      setAutoApplyLoading(true);
      setAutoApplyError("");
      setAutoApplyMessage("");
      setAutoAppliedJobs([]);

      const data = await apiRequest("/api/auto-apply/me", {
        method: "POST",
      });

      setAutoApplyMessage(data?.message || "Auto apply completed.");
      setAutoAppliedJobs(Array.isArray(data?.jobs) ? data.jobs : []);
      await refreshOperationalData();
    } catch (error) {
      setAutoApplyError(error.message || "Auto apply failed.");
      setAutoApplyMessage("");
    } finally {
      setAutoApplyLoading(false);
    }
  }

  async function handleCopyText(value, successMessage) {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      setPrepareMessage(successMessage);
    } catch {
      setPrepareError("Failed to copy text.");
    }
  }

  async function handleMarkApplied(jobOrId) {
    const job = typeof jobOrId === "object" && jobOrId
      ? jobOrId
      : savedJobs.find((item) => item._id === jobOrId);
    const id = job?._id || String(jobOrId || "");

    if (!job || !id) {
      return;
    }

    try {
      setApplyingJobId(id);
      setQueueActionError("");
      setQueueActionMessage("");
      const data = await apiRequest("/api/auto-apply/me", {
        method: "POST",
        body: JSON.stringify({
          jobId: id,
          jobTitle: job.title,
          company: job.company,
          applyUrl: job.applyUrl,
        }),
      });

      setAppliedJobId(id);
      setAutoApplyMessage(data?.message || "Applied successfully.");
      setQueueActionMessage("Application sent. Moving to the next match.");
      recordQueueReview("apply");

      window.setTimeout(async () => {
        markQueueJobHidden(id);
        setApplyingJobId(null);
        setAppliedJobId(null);
        await refreshOperationalData();
      }, 1000);
    } catch (error) {
      setApplyingJobId(null);
      setAppliedJobId(null);
      setQueueActionError(error.message || "Apply failed. Please try again.");
      showToast("Apply failed. Please try again.", "error");
    }
  }

  async function handleManualApplyStart(job) {
    const targetUrl = job?.applyUrl || job?.jobUrl;

    if (!targetUrl) {
      showToast("No job link available for this application.", "error");
      return;
    }

    const openedWindow = window.open(targetUrl, "_blank", "noopener,noreferrer");

    if (!openedWindow) {
      showToast("Your browser blocked the job page. Allow popups and try again.", "error");
      return;
    }

    try {
      const data = await apiRequest(`/api/jobs/${job._id}/in-progress`, {
        method: "PATCH",
      });

      const nextJob = data?.job;

      if (nextJob) {
        setSavedJobs((prev) => prev.map((item) => (item._id === job._id ? nextJob : item)));
        setSearchResults((prev) => prev.map((item) => (item._id === job._id ? nextJob : item)));
      }

      await Promise.allSettled([loadDashboardStats(), loadRecentApplications()]);
    } catch (error) {
      if (openedWindow && !openedWindow.closed) {
        openedWindow.focus();
      }

      showToast(error.message || "Failed to mark job as in progress.", "error");
    }
  }

  async function handleSkipJob(id) {
    if (!id) {
      return;
    }

    setSkippingJobId(id);
    setQueueActionError("");
    setQueueActionMessage("Job skipped. Showing the next match.");
    recordQueueReview("skip");
    markQueueJobHidden(id);
    setSwipeOffsetX(0);

    try {
      await apiRequest("/api/jobs/skip", {
        method: "POST",
        body: JSON.stringify({ jobId: id }),
      });
      await refreshOperationalData();
    } catch {
      setQueueActionError("We skipped this job in your queue, but couldn't sync that action yet.");
    } finally {
      setSkippingJobId("");
    }
  }

  handleMarkAppliedRef.current = handleMarkApplied;
  handleSkipJobRef.current = handleSkipJob;
  handleManualApplyStartRef.current = handleManualApplyStart;

  function handleQueueTouchStart(event) {
    const point = event.touches?.[0];

    if (!point) {
      return;
    }

    touchStartRef.current = { x: point.clientX, y: point.clientY };
    setSwipeOffsetX(0);
  }

  function handleQueueTouchMove(event) {
    const point = event.touches?.[0];
    const start = touchStartRef.current;

    if (!point || !start) {
      return;
    }

    const deltaX = point.clientX - start.x;
    const deltaY = point.clientY - start.y;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      setSwipeOffsetX(Math.max(-160, Math.min(160, deltaX)));
    }
  }

  function handleQueueTouchEnd() {
    if (!activeQueueJob) {
      setSwipeOffsetX(0);
      touchStartRef.current = null;
      return;
    }

    const threshold = 90;

    if (swipeOffsetX <= -threshold) {
      handleSkipJob(activeQueueJob._id);
    } else if (swipeOffsetX >= threshold) {
      if (isManualActionJob(activeQueueJob) && !activeQueueJob.manualApplyInProgress) {
        handleManualApplyStart(activeQueueJob);
      } else {
        handleMarkApplied(activeQueueJob);
      }
    }

    setSwipeOffsetX(0);
    touchStartRef.current = null;
  }

  function logout() {
    clearAuthAndRedirect();
  }

  const applicationsByJobRef = useMemo(
    () =>
      Object.fromEntries(
        applications
          .filter((item) => item?.job)
          .map((item) => [String(item.job), item])
      ),
    [applications]
  );
  const applicationsWithContext = useMemo(
    () =>
      applications.map((application) => {
        const job = application?.job ? jobsById[String(application.job)] || null : null;
        const lifecycleStatus = application.lifecycleStatus || getApplicationStatus(job, applicationStatuses);

        return {
          ...application,
          jobData: job,
          lifecycleStatus,
        };
      }),
    [applicationStatuses, applications, jobsById]
  );
  const applicationsById = useMemo(
    () =>
      Object.fromEntries(
        applicationsWithContext
          .filter((item) => item?._id)
          .map((item) => [String(item._id), item])
      ),
    [applicationsWithContext]
  );
  const applicationPipelineItems = useMemo(
    () =>
      applicationsWithContext.map((application) => ({
        _id: application._id,
        title: application.jobTitle || application.title || "Untitled role",
        company: application.company || "Unknown company",
        appliedAt: application.appliedAt,
        createdAt: application.createdAt,
        lifecycleStatus: application.lifecycleStatus || "Applied",
      })),
    [applicationsWithContext]
  );
  const targetedJobs = useMemo(
    () => [...matchedJobs, ...manualJobs, ...readyJobs].sort(sortByFreshness).slice(0, 12),
    [manualJobs, matchedJobs, readyJobs]
  );
  const viewedJobs = useMemo(
    () => applicationPipelineItems.filter((item) => item.lifecycleStatus === "Viewed"),
    [applicationPipelineItems]
  );
  const interviewJobs = useMemo(
    () => applicationPipelineItems.filter((item) => item.lifecycleStatus === "Interview"),
    [applicationPipelineItems]
  );
  const interviewApplications = useMemo(
    () => applicationsWithContext.filter((application) => application.lifecycleStatus === "Interview"),
    [applicationsWithContext]
  );
  const offerApplications = useMemo(
    () =>
      applicationsWithContext.filter(
        (application) => application.lifecycleStatus === "Offer" || application.lifecycleStatus === "Negotiating"
      ),
    [applicationsWithContext]
  );
  const offerJobs = useMemo(
    () => applicationPipelineItems.filter((item) => item.lifecycleStatus === "Offer"),
    [applicationPipelineItems]
  );
  const negotiatingJobs = useMemo(
    () => applicationPipelineItems.filter((item) => item.lifecycleStatus === "Negotiating"),
    [applicationPipelineItems]
  );
  const liveActivityFeed = useMemo(
    () => buildLiveActivityFeed({ applications, savedJobs, applicationStatuses }),
    [applicationStatuses, applications, savedJobs]
  );
  const activeInterviewApplication = activeInterviewApplicationId
    ? applicationsById[activeInterviewApplicationId] || null
    : null;
  const activeInterviewJob = activeInterviewApplication?.jobData || null;
  const activeInterviewPrep = activeInterviewApplication
    ? interviewPrepByApplicationId[activeInterviewApplication._id] || null
    : null;
  const activeOfferApplication = activeOfferApplicationId
    ? applicationsById[activeOfferApplicationId] || null
    : null;
  const activeOfferJob = activeOfferApplication?.jobData || null;
  const activeOfferStrategy = activeOfferApplication
    ? offerStrategyByApplicationId[activeOfferApplication._id] || null
    : null;
  const groupedSourceCatalog = useMemo(
    () => ({
      india: sourceCatalog.filter((item) => item.category === "india"),
      global: sourceCatalog.filter((item) => item.category === "global"),
      startup: sourceCatalog.filter((item) => item.category === "startup"),
      niche: sourceCatalog.filter((item) => item.category === "niche"),
    }),
    [sourceCatalog]
  );
  const generatedCoverLetterJobs = useMemo(
    () => savedJobs.filter((job) => job.coverLetterText),
    [savedJobs]
  );
  const tailoredResumeJobs = useMemo(
    () => savedJobs.filter((job) => job.resumeVariants?.length),
    [savedJobs]
  );
  const dashboardStatCards = [
    {
      key: "applications",
      label: "Total Applications Sent",
      value: Number(dashboardStats?.totalApplicationsSent || 0),
      meta: dashboardStats ? "All-time sends tracked by HireFlow" : "Getting started...",
    },
    {
      key: "interviews",
      label: "Interviews Scheduled",
      value: Number(dashboardStats?.interviewsScheduled || 0) > 0 ? Number(dashboardStats?.interviewsScheduled || 0) : "—",
      meta: dashboardStats ? "Interview-stage applications" : "Getting started...",
    },
    {
      key: "responseRate",
      label: "Response Rate",
      value: Number(dashboardStats?.responseRate || 0) > 0 ? `${Number(dashboardStats?.responseRate || 0)}%` : "Send applications to track this",
      meta: dashboardStats ? "Responses divided by applications" : "Getting started...",
    },
    {
      key: "queue",
      label: "Jobs In Queue",
      value: Number(dashboardStats?.jobsInQueue || 0),
      meta: dashboardStats ? "Ready for review in your queue" : "Getting started...",
    },
  ];
  const applicationsUsed = Number(dashboardStats?.applicationsUsed ?? applicationsWithContext.length ?? 0);
  const applicationsLimit = Number(dashboardStats?.applicationLimit ?? (Number.isFinite(planLimit) ? planLimit : 0));
  const planUsagePercent = applicationsLimit > 0 ? Math.min(100, applicationsUsed / applicationsLimit * 100) : 0;
  const dashboardUserName =
    user?.name?.trim() ||
    user?.email?.split("@")?.[0] ||
    "HireFlow user";
  const dashboardUserInitials = dashboardUserName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "HF";
  const totalApplicationsSent = Number(
    pipelineSummary?.totalApplications ?? dashboardStats?.totalApplicationsSent ?? 0
  );
  const jobsWaitingInQueue = Number(
    pipelineSummary?.queueCount ?? dashboardStats?.jobsInQueue ?? visibleQueuedJobs.length ?? 0
  );
  const showStarterInsightsCard = !dashboardStatsLoading && totalApplicationsSent === 0;
  const appliedCount = Number(pipelineSummary?.appliedCount ?? applicationsWithContext.length);
  const interviewsReceived = Number(pipelineSummary?.interviewCount ?? interviewJobs.length);
  const viewedCount = Number(pipelineSummary?.viewedCount ?? viewedJobs.length);
  const offerCount = Number(pipelineSummary?.offerCount ?? offerJobs.length);
  const negotiatingCount = Number(pipelineSummary?.negotiatingCount ?? negotiatingJobs.length);
  const failedCount = Number(pipelineSummary?.failedCount ?? 0);
  const manualActionNeededCount = Number(
    pipelineSummary?.manualActionNeededCount ?? manualJobs.length
  );
  const readyJobsCount = Number(pipelineSummary?.readyCount ?? readyJobs.length);
  const matchedJobsCount = Number(pipelineSummary?.matchedCount ?? matchedJobs.length);
  const respondedCount = viewedCount + interviewsReceived + offerCount + negotiatingCount;
  const responseRate = appliedCount ? Math.round(respondedCount / appliedCount * 100) : 0;
  const pipelineLanes = [
    { title: "Targeted", count: jobsWaitingInQueue, tone: "blue", jobs: targetedJobs },
    { title: "Matched", count: matchedJobsCount, tone: "blue", jobs: matchedJobs },
    { title: "Ready", count: readyJobsCount, tone: "green", jobs: readyJobs },
    { title: "Manual Action Needed", count: manualActionNeededCount, tone: "amber", jobs: manualJobs },
    { title: "Applied", count: appliedCount, tone: "dark", jobs: applicationPipelineItems },
    { title: "Viewed", count: viewedCount, tone: "blue", jobs: viewedJobs },
    { title: "Interview", count: interviewsReceived, tone: "green", jobs: interviewJobs },
    { title: "Offer", count: offerCount, tone: "green", jobs: offerJobs },
    { title: "Negotiating", count: negotiatingCount, tone: "amber", jobs: negotiatingJobs },
    { title: "Failed", count: failedCount, tone: "gray", jobs: [] },
  ].filter((lane) => lane.count > 0);
  const activeControlSection =
    activeDashboardTab === "billing"
      ? "settings"
      : ["queue", "applications", "resume", "settings"].includes(activeDashboardTab)
        ? activeDashboardTab
        : "";
  const queueSectionSummary = jobsWaitingInQueue
    ? `${jobsWaitingInQueue} matches ready • ${queueAppliedToday} applied today`
    : "Find jobs and review the strongest matches first.";
  const applicationsSectionSummary = appliedCount
    ? `${appliedCount} tracked applications${interviewsReceived ? ` • ${interviewsReceived} interviews` : ""}`
    : "Track every application and keep progress moving.";
  const tailoredResumeCount = tailoredResumeJobs.length;
  const resumeSectionSummary = resumeVaultText
    ? `Master resume saved${tailoredResumeCount ? ` • ${tailoredResumeCount} tailored versions ready` : ""}`
    : "Save or replace your master resume to power tailoring.";
  const settingsSectionSummary = [
    preferredRoles.length ? preferredRoles.slice(0, 2).join(", ") : "Roles not set",
    preferredLocations.length ? preferredLocations.slice(0, 2).join(", ") : "Locations not set",
    workTypes.length ? workTypes.join(", ") : "Work type not set",
  ].join(" • ");
  const latestActivityAt =
    recentApplications[0]?.appliedAt ||
    applicationsWithContext[0]?.appliedAt ||
    null;
  const appliedTodayCount = applicationsWithContext.filter((application) => {
    if (!application?.appliedAt) {
      return false;
    }

    const appliedDate = new Date(application.appliedAt);
    const today = new Date();

    return appliedDate.toDateString() === today.toDateString();
  }).length;
  const autoApplyIndicator = autoApplyLoading
    ? "Running now"
    : readyJobsCount > 0
      ? `${readyJobsCount} ready`
      : "Idle";
  const trustIndicators = [
    {
      key: "matched",
      label: "Matched",
      value: matchedJobsCount,
    },
    {
      key: "applied",
      label: "Sent",
      value: totalApplicationsSent,
    },
    {
      key: "latest",
      label: "Latest Activity",
      value: latestActivityAt ? formatRelativeTime(latestActivityAt) : "No activity yet",
    },
    {
      key: "auto-apply",
      label: "Auto-Apply",
      value: autoApplyIndicator,
    },
    {
      key: "manual",
      label: "Manual Needed",
      value: manualActionNeededCount,
    },
  ];
  const nextActionBanner = !resumeVaultText?.trim()
    ? {
        title: "Upload your resume to start",
        body: "Save your master resume first so HireFlow can tailor assets and apply safely.",
        actionLabel: "Save Resume",
        onAction: () => goToDashboardTab("resume"),
      }
    : !preferredRoles.length || !preferredLocations.length
      ? {
          title: "Save your preferences",
          body: "Add target roles and locations so HireFlow can find stronger matches for you.",
          actionLabel: "Open Settings",
          onAction: () => goToDashboardTab("settings"),
        }
    : manualActionNeededCount > 0
      ? {
          title: `${manualActionNeededCount} job${manualActionNeededCount === 1 ? "" : "s"} need your action`,
          body: "Finish the manual applications first so your pipeline keeps moving.",
          actionLabel: "Open Jobs",
          onAction: () => goToDashboardTab("queue"),
        }
      : jobsWaitingInQueue > 0
        ? {
            title: `Review ${jobsWaitingInQueue} matched job${jobsWaitingInQueue === 1 ? "" : "s"}`,
            body: "Your strongest matches are ready for review now.",
            actionLabel: "Review Jobs",
            onAction: () => goToDashboardTab("queue"),
          }
        : {
            title: "Refresh your job queue",
            body: "HireFlow is ready for the next batch of matches.",
            actionLabel: "Find Jobs",
            onAction: handleJobsSearch,
          };
  useEffect(() => {
    if (activeDashboardTab !== "applications") {
      return;
    }

    if (!interviewApplications.length) {
      setActiveInterviewApplicationId("");
      return;
    }

    if (
      activeInterviewApplicationId &&
      interviewApplications.some((application) => application._id === activeInterviewApplicationId)
    ) {
      return;
    }

    setActiveInterviewApplicationId(interviewApplications[0]._id);
  }, [activeDashboardTab, activeInterviewApplicationId, interviewApplications]);

  useEffect(() => {
    if (activeDashboardTab !== "applications" || !activeInterviewApplicationId) {
      return;
    }

    if (interviewPrepByApplicationId[activeInterviewApplicationId] || interviewPrepLoadingId === activeInterviewApplicationId) {
      return;
    }

    loadInterviewPrep(activeInterviewApplicationId);
  }, [activeDashboardTab, activeInterviewApplicationId, interviewPrepByApplicationId, interviewPrepLoadingId, loadInterviewPrep]);

  useEffect(() => {
    if (activeDashboardTab !== "applications") {
      return;
    }

    if (!offerApplications.length) {
      setActiveOfferApplicationId("");
      return;
    }

    if (
      activeOfferApplicationId &&
      offerApplications.some((application) => application._id === activeOfferApplicationId)
    ) {
      return;
    }

    setActiveOfferApplicationId(offerApplications[0]._id);
  }, [activeDashboardTab, activeOfferApplicationId, offerApplications]);

  useEffect(() => {
    if (activeDashboardTab !== "applications" || !activeOfferApplicationId) {
      return;
    }

    if (offerStrategyByApplicationId[activeOfferApplicationId] || offerStrategyLoadingId === activeOfferApplicationId) {
      return;
    }

    loadOfferStrategy(activeOfferApplicationId);
  }, [activeDashboardTab, activeOfferApplicationId, loadOfferStrategy, offerStrategyByApplicationId, offerStrategyLoadingId]);

  async function updateApplicationStatus(jobId, status) {
    const application = applicationsByJobRef[jobId];

    setApplicationStatuses((prev) => ({
      ...prev,
      [jobId]: status,
    }));

    if (!application?._id) {
      return;
    }

    try {
      setUpdatingApplicationId(application._id);

      const data = await apiRequest(`/api/applications/${application._id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          lifecycleStatus: status,
        }),
      });

      if (data?.application) {
        setApplications((prev) => prev.map((item) => (item._id === data.application._id ? data.application : item)));
      }

      if (data?.analytics) {
        setApplicationAnalytics(data.analytics);
      }

      if (status === "Interview" && application?._id) {
        goToDashboardTab("applications");
        setActiveInterviewApplicationId(application._id);
        await loadInterviewPrep(application._id);
      }

      if ((status === "Offer" || status === "Negotiating") && application?._id) {
        goToDashboardTab("applications");
        setActiveOfferApplicationId(application._id);
      }
    } catch (error) {
      setApplicationsError(error.message || "Failed to update application status.");
    } finally {
      setUpdatingApplicationId("");
    }
  }

  function canRetryApplication(application) {
    const job = application?.jobData || null;
    const jobReferences = [application?.job, application?.jobId, job?._id, job?.jobId]
      .map((value) => String(value || "").trim())
      .filter(Boolean);
    const alreadyApplied = applications.some((item) => {
      if (!item || item._id === application?._id || item.status !== "applied") {
        return false;
      }

      const itemReferences = [item?.job, item?.jobId]
        .map((value) => String(value || "").trim())
        .filter(Boolean);

      return itemReferences.some((candidate) => jobReferences.includes(candidate));
    });

    if (!application || application.status !== "failed" || alreadyApplied) {
      return false;
    }

    if (job?.manualActionRequired || job?.manualActionNeeded) {
      return true;
    }

    return job?.sourceCapabilities?.autoApplySupported === true;
  }

  async function handleRetryApplication(application) {
    if (!application?._id) {
      return;
    }

    try {
      setRetryingApplicationId(application._id);
      setApplicationRetryError("");
      setApplicationRetryMessage("");

      const retryData = await apiRequest(`/api/applications/${application._id}/retry`, {
        method: "POST",
      });

      if (retryData?.application) {
        setApplications((prev) =>
          prev.map((item) => (item._id === retryData.application._id ? retryData.application : item))
        );
      }

      if (retryData?.mode === "manual") {
        const jobUrl = retryData?.job?.applyUrl || application?.applyUrl || application?.jobData?.applyUrl || application?.jobData?.jobUrl || "";

        if (jobUrl) {
          const openedWindow = window.open(jobUrl, "_blank", "noopener,noreferrer");

          if (!openedWindow) {
            setApplicationRetryError("Your browser blocked the job page. Allow popups and try again.");
            return;
          }
        }

        setApplicationRetryMessage(
          retryData?.message || "Manual retry opened. Complete the submission, then mark the job applied."
        );
        await Promise.all([loadStoredJobs(), loadDashboardStats()]);
        return;
      }

      if (retryData?.mode === "auto" && retryData?.job?._id) {
        const applyData = await apiRequest("/api/auto-apply/me", {
          method: "POST",
          body: JSON.stringify({
            jobId: retryData.job._id,
          }),
        });

        setApplicationRetryMessage(applyData?.message || "Application retry completed.");
        await Promise.all([loadApplications(), loadStoredJobs(), loadDashboardStats()]);
        return;
      }

      setApplicationRetryError("Retry could not continue for this application.");
    } catch (error) {
      setApplicationRetryError(error.message || "Retry failed. Please try again.");
    } finally {
      setRetryingApplicationId("");
    }
  }

  function updateInterviewAnswerDraft(applicationId, question, value) {
    const key = `${applicationId}::${question}`;
    setInterviewAnswerDrafts((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function handleEvaluateInterviewAnswer(applicationId, question, mode = "text") {
    const key = `${applicationId}::${question}`;
    const answer = String(interviewAnswerDrafts[key] || "").trim();

    if (!answer) {
      setInterviewPrepError("Add an answer before asking HireFlow for coaching feedback.");
      return;
    }

    try {
      setEvaluatingInterviewQuestionKey(key);
      setInterviewPrepError("");

      const data = await apiRequest(`/api/applications/${applicationId}/interview-prep/evaluate`, {
        method: "POST",
        body: JSON.stringify({
          question,
          answer,
          mode,
        }),
      });

      if (data?.interviewPrep) {
        setInterviewPrepByApplicationId((prev) => ({
          ...prev,
          [applicationId]: data.interviewPrep,
        }));
      }
    } catch (error) {
      setInterviewPrepError(error.message || "Failed to evaluate interview answer.");
    } finally {
      setEvaluatingInterviewQuestionKey("");
    }
  }

  function handleStartVoiceInterviewAnswer(applicationId, question) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setInterviewPrepError("Voice practice is not supported in this browser yet. You can still practice by typing your answer.");
      return;
    }

    const key = `${applicationId}::${question}`;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;

    let finalTranscript = "";
    setInterviewPrepError("");
    setRecordingInterviewQuestionKey(key);

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript || "")
        .join(" ");

      finalTranscript = transcript;
      updateInterviewAnswerDraft(applicationId, question, transcript);
    };

    recognition.onerror = () => {
      setInterviewPrepError("Voice capture did not complete. You can try again or switch to text practice.");
      setRecordingInterviewQuestionKey("");
    };

    recognition.onend = () => {
      setRecordingInterviewQuestionKey("");

      if (finalTranscript.trim()) {
        handleEvaluateInterviewAnswer(applicationId, question, "voice");
      }
    };

    recognition.start();
  }

  function updateOfferDraft(applicationId, field, value) {
    setOfferDrafts((prev) => ({
      ...prev,
      [applicationId]: {
        ...(prev[applicationId] || {}),
        [field]: value,
      },
    }));
  }

  function updateCounterGoalDraft(applicationId, value) {
    setCounterGoalDrafts((prev) => ({
      ...prev,
      [applicationId]: value,
    }));
  }

  async function handlePrepareOfferStrategy(applicationId) {
    const draft = offerDrafts[applicationId] || {};
    const offerAmount = Number(draft.initialOfferAmount || draft.currentOfferAmount || 0);

    if (!Number.isFinite(offerAmount) || offerAmount <= 0) {
      setOfferStrategyError("Enter the current offer amount so HireFlow can benchmark it.");
      return;
    }

    try {
      setOfferActionLoadingKey(`${applicationId}:prepare`);
      setOfferStrategyError("");
      const negotiation = await loadOfferStrategy(applicationId, {
        force: true,
        offerAmount,
      });

      if (negotiation) {
        setOfferDrafts((prev) => ({
          ...prev,
          [applicationId]: {
            initialOfferAmount: negotiation.initialOfferAmount || offerAmount,
            currentOfferAmount: negotiation.currentOfferAmount || offerAmount,
            finalOfferAmount: negotiation.finalOfferAmount || "",
          },
        }));
      }
    } finally {
      setOfferActionLoadingKey("");
    }
  }

  async function handleGenerateCounterResponse(applicationId) {
    const draft = offerDrafts[applicationId] || {};
    const currentOfferAmount = Number(draft.currentOfferAmount || 0);

    if (!Number.isFinite(currentOfferAmount) || currentOfferAmount <= 0) {
      setOfferStrategyError("Add the current company counter amount before generating the next reply.");
      return;
    }

    try {
      setOfferActionLoadingKey(`${applicationId}:counter`);
      setOfferStrategyError("");

      const data = await apiRequest(`/api/applications/${applicationId}/offer-negotiation/counter`, {
        method: "POST",
        body: JSON.stringify({
          currentOfferAmount,
          candidateGoal: counterGoalDrafts[applicationId] || "",
        }),
      });

      if (data?.offerNegotiation) {
        setOfferStrategyByApplicationId((prev) => ({
          ...prev,
          [applicationId]: data.offerNegotiation,
        }));
      }
    } catch (error) {
      setOfferStrategyError(error.message || "Failed to generate the next negotiation reply.");
    } finally {
      setOfferActionLoadingKey("");
    }
  }

  async function handleFinalizeOffer(applicationId) {
    const draft = offerDrafts[applicationId] || {};
    const finalOfferAmount = Number(draft.finalOfferAmount || 0);

    if (!Number.isFinite(finalOfferAmount) || finalOfferAmount <= 0) {
      setOfferStrategyError("Add the final accepted offer amount so HireFlow can track the uplift.");
      return;
    }

    try {
      setOfferActionLoadingKey(`${applicationId}:finalize`);
      setOfferStrategyError("");

      const data = await apiRequest(`/api/applications/${applicationId}/offer-negotiation/finalize`, {
        method: "POST",
        body: JSON.stringify({
          finalOfferAmount,
        }),
      });

      if (data?.offerNegotiation) {
        setOfferStrategyByApplicationId((prev) => ({
          ...prev,
          [applicationId]: data.offerNegotiation,
        }));
      }

      if (data?.message) {
        setOfferStrategyError("");
      }
    } catch (error) {
      setOfferStrategyError(error.message || "Failed to finalize the offer outcome.");
    } finally {
      setOfferActionLoadingKey("");
    }
  }

  function updateCoverLetterEdit(jobId, value) {
    setCoverLetterEdits((prev) => ({
      ...prev,
      [jobId]: value,
    }));
  }

  const referralLink = referralStats?.referralLink || "";
  const successfulReferrals = Number(referralStats?.referralsCount || 0);
  const freeMonthsEarned = Number(referralStats?.freeMonthsEarned || 0);
  const bonusWeeksGranted = Number(referralStats?.bonusWeeksGranted || 0);
  const careerInterviewProgress = Math.round(
    CAREER_INTERVIEW_QUESTIONS.filter((item) => String(careerInterviewAnswers[item.key] || "").trim()).length /
      CAREER_INTERVIEW_QUESTIONS.length * 100
  );
  const hardSkills = Array.isArray(careerDna?.hardSkills) ? careerDna.hardSkills : [];
  const softSkills = Array.isArray(careerDna?.softSkills) ? careerDna.softSkills : [];

  async function handleInviteFriends() {
    if (!referralLink) {
      setInviteMessage("Referral link is still loading.");
      return;
    }

    const shareText = `Join HireFlow AI and get 2 weeks free: ${referralLink}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "HireFlow AI",
          text: "Join HireFlow AI and get 2 weeks free.",
          url: referralLink,
        });
        setInviteMessage("Referral link shared.");
        return;
      }

      await navigator.clipboard.writeText(shareText);
      setInviteMessage("Referral link copied.");
    } catch {
      setInviteMessage("Share canceled. You can still copy your referral link below.");
    }
  }

  async function handleCopyReferralLink() {
    if (!referralLink) {
      setInviteMessage("Referral link unavailable right now.");
      return;
    }

    try {
      await navigator.clipboard.writeText(referralLink);
      setInviteMessage("Referral link copied.");
    } catch {
      setInviteMessage("Could not copy the referral link.");
    }
  }

  const loadingPage = <LoadingScreen message="Checking your session..." />;

  const authScreenPage = (
    <div className="hf-page">
      <div className="hf-bg-glow hf-bg-glow-left" />
      <div className="hf-bg-glow hf-bg-glow-right" />
      <AuthScreen
        authMode={authMode}
        authLoading={authLoading}
        authMessage={authMessage}
        loginEmail={loginEmail}
        loginPassword={loginPassword}
        registerName={registerName}
        registerEmail={registerEmail}
        registerPassword={registerPassword}
        registerReferralCode={registerReferralCode}
        onAuthModeChange={setAuthMode}
        onLoginEmailChange={setLoginEmail}
        onLoginPasswordChange={setLoginPassword}
        onRegisterNameChange={setRegisterName}
        onRegisterEmailChange={setRegisterEmail}
        onRegisterPasswordChange={setRegisterPassword}
        onLogin={handleLogin}
        onRegister={handleRegister}
      />
    </div>
  );

  const bootErrorPage = (
    <div className="hf-page">
      <div className="hf-loading-card hf-error-card">
        <h2>App failed to load</h2>
        <p>{bootError}</p>
        {isTimeoutErrorMessage(bootError) ? (
          <button className="hf-btn hf-btn-primary" onClick={bootstrap}>
            Retry
          </button>
        ) : null}
      </div>
    </div>
  );

  const dashboardShell = (
    <div className="hf-page">
      <div className="hf-bg-glow hf-bg-glow-left" />
      <div className="hf-bg-glow hf-bg-glow-right" />
      <div className="hf-shell">
        <header className="hf-navbar">
          <div className="hf-brand">
            <div className="hf-brand-mark">H</div>
            <div className="hf-brand-copy">
              <span className="hf-brand-eyebrow">HireFlow AI</span>
              <h1>HireFlow AI</h1>
              <p>Auto-apply to jobs intelligently</p>
            </div>
          </div>

          <nav className="hf-navbar-links" aria-label="Primary">
            {[
              { key: "queue", label: "Jobs" },
              { key: "applications", label: "Applications" },
              { key: "resume", label: "Resume" },
              { key: "settings", label: "Settings" },
            ].map((item) => (
              <button
                key={item.key}
                className={activeDashboardTab === item.key ? "hf-navbar-link active" : "hf-navbar-link"}
                onClick={() => goToDashboardTab(item.key)}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="hf-userbar">
            <div className="hf-user-avatar" aria-hidden="true">{dashboardUserInitials}</div>
            <div className="hf-user-meta">
              <span className="hf-user-label">{dashboardUserName}</span>
              <span className="hf-user-email">{user?.email || "Unknown user"}</span>
            </div>

            <div className="hf-chip-row hf-user-chips">
              <span className="hf-chip hf-chip-red">{user?.plan || "free"}</span>
              <button className="hf-btn hf-btn-ghost" onClick={logout}>
                Logout
              </button>
            </div>
          </div>
        </header>
        <section className="hf-command-stats">
          {dashboardStatsLoading
            ? Array.from({ length: 4 }).map((_, index) => <DashboardStatSkeleton key={`dashboard-stat-${index}`} />)
            : showStarterInsightsCard
              ? (
                <div className="hf-stat-card hf-stat-card-wide">
                  <span>Welcome to HireFlow</span>
                  <strong>{`Welcome to HireFlow, ${dashboardUserName}!`}</strong>
                  <small>{`You have ${jobsWaitingInQueue} jobs waiting in your queue. Start reviewing to send your first application.`}</small>
                  <button className="hf-btn hf-btn-primary hf-btn-small" onClick={() => goToDashboardTab("queue")}>
                    Go to Job Queue →
                  </button>
                </div>
                )
              : dashboardStatCards.map((card) => (
                <StatCard key={card.key} label={card.label} value={card.value} meta={card.meta} />
                ))}
        </section>
        {dashboardStatsLoading ? (
          <p className="hf-status-note">Refreshing dashboard metrics...</p>
        ) : dashboardStatsMessage && !dashboardStatsError ? (
          <p className="hf-status-note hf-status-note-success">{dashboardStatsMessage}</p>
        ) : null}
        <section className="hf-next-action-banner" aria-label="Next action">
          <div className="hf-next-action-copy">
            <span className="hf-label">Next Action</span>
            <strong>{nextActionBanner.title}</strong>
            <p>{nextActionBanner.body}</p>
          </div>
          <div className="hf-next-action-meta">
            <div className="hf-next-action-signal">
              <span>Applied today</span>
              <strong>{appliedTodayCount}</strong>
            </div>
            <div className="hf-next-action-signal">
              <span>Last activity</span>
              <strong>{latestActivityAt ? formatRelativeTime(latestActivityAt) : "No activity yet"}</strong>
            </div>
            <button className="hf-btn hf-btn-primary" onClick={nextActionBanner.onAction}>
              {nextActionBanner.actionLabel}
            </button>
          </div>
        </section>
        <section className="hf-trust-indicators" aria-label="Dashboard signals">
          {trustIndicators.map((item) => (
            <div className="hf-trust-indicator" key={item.key}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </section>

        {activeDashboardTab === "home" ? (
          <section className="hf-dashboard-home">
            <div className="hf-dashboard-home-main">
              <div className="hf-panel hf-panel-nested">
                <div className="hf-panel-header">
                  <div>
                    <h3>Recent Applications</h3>
                    <p>Your latest five sends and where they stand right now.</p>
                  </div>
                  <button className="hf-btn hf-btn-ghost hf-btn-small" onClick={loadRecentApplications}>
                    Refresh
                  </button>
                </div>

                {recentApplicationsLoading ? (
                  <div className="hf-home-list">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <RecentApplicationSkeleton key={`recent-application-skeleton-${index}`} />
                    ))}
                  </div>
                ) : recentApplicationsError ? (
                  <DashboardInlineState
                    icon="⚠️"
                    title="Something went wrong"
                    subtitle="We couldn't load your jobs right now."
                    actionLabel="Try again"
                    onAction={retryDashboardHome}
                  />
                ) : recentApplications.length ? (
                  <div className="hf-home-list">
                    {recentApplications.map((application) => (
                      <div className="hf-recent-app-card" key={application._id}>
                        <div className="hf-recent-app-copy">
                          <strong>{application.company || "Unknown company"}</strong>
                          <span>{application.title || "Untitled role"}</span>
                        </div>
                        <div className="hf-recent-app-meta">
                          <span>{formatDate(application.appliedAt)}</span>
                          <span className={`hf-status-badge ${getLifecycleStatusClass(application.lifecycleStatus)}`}>
                            {application.lifecycleStatus || "Applied"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <DashboardInlineState
                    icon="○"
                    title="No applications yet."
                    subtitle="Go to Jobs to start applying →"
                    actionLabel="Go to Jobs"
                    onAction={() => goToDashboardTab("queue")}
                  />
                )}
              </div>
            </div>

            <aside className="hf-dashboard-home-side">
              <div className="hf-panel hf-panel-nested">
                <div className="hf-panel-header">
                  <h3>Quick Actions</h3>
                  <p>Jump straight into the next high-value move.</p>
                </div>
                <div className="hf-quick-actions">
                  <button className="hf-quick-action-btn" onClick={() => goToDashboardTab("resume")}>Upload Resume</button>
                  <button className="hf-quick-action-btn" onClick={() => goToDashboardTab("queue")}>Search Jobs</button>
                  <button className="hf-quick-action-btn" onClick={() => goToDashboardTab("applications")}>Generate Cover Letter</button>
                  <button className="hf-quick-action-btn" onClick={() => goToDashboardTab("applications")}>View Applications</button>
                </div>
              </div>

              <div className="hf-panel hf-panel-nested">
                <div className="hf-panel-header">
                  <h3>Plan Status</h3>
                  <p>Track usage and stay ahead of your current limit.</p>
                </div>

                <div className="hf-plan-card">
                  <div className="hf-plan-head">
                    <div>
                      <span className="hf-label">Current plan</span>
                      <strong>{formatPlanName(user?.plan)}</strong>
                    </div>
                    <span className="hf-chip hf-chip-red">{user?.status || "active"}</span>
                  </div>
                  <p className="hf-muted-line">
                    {applicationsLimit > 0
                      ? `${applicationsUsed} of ${applicationsLimit} applications used`
                      : `${applicationsUsed} applications used`}
                  </p>
                  <div className="hf-usage-bar">
                    <div className="hf-usage-fill" style={{ width: `${planUsagePercent}%` }} />
                  </div>
                  {user?.plan === "free" ? (
                    <button className="hf-btn hf-btn-primary hf-full-btn" onClick={() => goToDashboardTab("billing")}>
                      Upgrade Plan
                    </button>
                  ) : null}
                </div>
              </div>

              {dashboardStatsError ? (
                <div className="hf-panel hf-panel-nested">
                  <DashboardInlineState
                    icon="⚠️"
                    title="Stats are still loading"
                    subtitle={dashboardStatsError}
                    actionLabel="Try again"
                    onAction={retryDashboardHome}
                  />
                </div>
              ) : null}
            </aside>
          </section>
        ) : (
        <>
        <section className="hf-war-room">
          <div className="hf-war-column hf-panel">
            <div className="hf-panel-header">
              <h3>Pipeline</h3>
              <p>See every stage of the hiring war at a glance.</p>
            </div>

            <div className="hf-pipeline-rail">
              {pipelineLanes.length ? (
                pipelineLanes.map((lane) => (
                  <PipelineLane key={lane.title} title={lane.title} count={lane.count} tone={lane.tone} jobs={lane.jobs} />
                ))
              ) : (
                  <DashboardInlineState
                    icon="→"
                    title="Your pipeline is empty."
                    subtitle="Go review your job matches to get started."
                    actionLabel="View Job Queue →"
                    onAction={() => goToDashboardTab("queue")}
                  />
              )}
            </div>
          </div>

          <div className="hf-war-column hf-panel">
            <div className="hf-panel-header">
              <h3>Live Activity Feed</h3>
              <p>The latest moves, openings, and high-signal changes happening right now.</p>
            </div>

            <div className="hf-activity-feed">
              {liveActivityFeed.length ? (
                liveActivityFeed.map((item) => (
                  <div className="hf-activity-item" key={item.id}>
                    <span className={`hf-chip ${item.tone}`}>{item.label}</span>
                    <strong>{item.title}</strong>
                    <p>{item.body}</p>
                    <span className="hf-activity-time">{item.timeAgo}</span>
                  </div>
                ))
              ) : (
                <div className="hf-empty-card hf-empty-card-compact">
                  Activity will appear here as jobs are matched, applied, and updated.
                </div>
              )}
            </div>
          </div>

          <div className="hf-war-column hf-panel">
            <div className="hf-panel-header">
              <h3>Intelligence</h3>
              <p>Signals that help you understand what is working and where to press harder.</p>
            </div>

            {appliedCount >= 10 ? (
              <div className="hf-intelligence-grid">
                <IntelligenceCard
                  title="Response rate"
                  value={`${responseRate}%`}
                  detail="This updates as companies view and respond to your applications."
                />
              </div>
            ) : (
              <DashboardInlineState
                icon="○"
                title="Intelligence signals appear after your first 10 applications."
                subtitle="Keep reviewing and sending applications to unlock performance insights."
              />
            )}
          </div>
        </section>

        <section className="hf-command-layout">
          <aside className="hf-command-sidebar hf-panel">
            <div className="hf-panel-header">
              <h3>Command Center</h3>
              <p>Plan, usage, and the fastest controls in one sidebar.</p>
            </div>

            <div className="hf-sidebar-stack">
              <div className="hf-sidebar-card">
                <span className="hf-label">Current Plan</span>
                <div className="hf-chip-row">
                  <span className="hf-chip hf-chip-red">{user?.plan || "free"}</span>
                  <span className="hf-chip hf-chip-dark">{user?.status || "active"}</span>
                </div>
              </div>

              <div className="hf-sidebar-card">
                <span className="hf-label">Usage Meter</span>
                <div className="hf-usage-bar">
                  <div
                    className="hf-usage-fill"
                    style={{ width: applicationsLimit === Infinity ? "22%" : `${planUsagePercent}%` }}
                  />
                </div>
                <p className="hf-muted-line">
                  {applicationsLimit === Infinity
                    ? `${applicationsUsed} applications used this cycle`
                    : `${applicationsUsed} of ${applicationsLimit} applications used`}
                </p>
                {user?.plan === "free" ? (
                  <button className="hf-btn hf-btn-primary hf-full-btn">Upgrade to Pro</button>
                ) : null}
              </div>

              <div className="hf-sidebar-card" ref={quickSettingsRef}>
                <span className="hf-label">Quick Settings</span>
                <div className="hf-chip-row">
                  {workTypes.map((type) => (
                    <span className="hf-chip hf-chip-green" key={type}>
                      {type}
                    </span>
                  ))}
                </div>
                <p className="hf-muted-line">
                  Roles: {preferredRoles.length ? preferredRoles.join(", ") : "Not set"}
                </p>
                <p className="hf-muted-line">
                  Locations: {preferredLocations.length ? preferredLocations.join(", ") : "Not set"}
                </p>
                <div className="hf-sidebar-actions">
                  <button className="hf-btn hf-btn-secondary" onClick={handleJobsSearch} disabled={jobsLoading}>
                    {jobsLoading ? "Searching..." : "Refresh Queue"}
                  </button>
                  <button className="hf-btn hf-btn-ghost" onClick={handleSavePreferences} disabled={preferencesSaving}>
                    {preferencesSaving ? "Saving..." : "Save Settings"}
                  </button>
                  <button className="hf-btn hf-btn-ghost" onClick={handleAutoApplyNow} disabled={autoApplyLoading}>
                    {autoApplyLoading ? "Running..." : "Run Auto Apply"}
                  </button>
                </div>
                {autoApplyLoading ? <p className="hf-status-note">Running auto apply on your saved queue...</p> : null}
                {autoApplyMessage ? (
                  <p className="hf-success">
                    {autoApplyMessage}
                    {autoAppliedJobs.length ? ` ${autoAppliedJobs.length} job${autoAppliedJobs.length === 1 ? "" : "s"} moved forward.` : ""}
                  </p>
                ) : null}
                {autoApplyError ? <p className="hf-error">{autoApplyError}</p> : null}
              </div>
            </div>
          </aside>

          <main className="hf-command-main hf-panel">
            <div className="hf-control-center-actions">
              <button className="hf-btn hf-btn-primary" onClick={handleSavePreferences} disabled={preferencesSaving}>
                {preferencesSaving ? "Saving..." : "Save Preferences"}
              </button>
              <button className="hf-btn hf-btn-secondary" onClick={handleSaveResumeVault} disabled={resumeVaultSaving || resumeVaultLoading}>
                {resumeVaultSaving ? "Saving..." : resumeVaultText ? "Replace Resume" : "Save Resume"}
              </button>
              <button className="hf-btn hf-btn-secondary" onClick={handleJobsSearch} disabled={jobsLoading}>
                {jobsLoading ? "Searching..." : "Find Jobs"}
              </button>
            </div>

            <JobsSection
              ControlCenterSection={ControlCenterSection}
              QueueStateCard={QueueStateCard}
              JobSkeleton={JobSkeleton}
              QueuePreviewCard={QueuePreviewCard}
              JobCard={JobCard}
              queueSectionSummary={queueSectionSummary}
              activeControlSection={activeControlSection}
              goToDashboardTab={goToDashboardTab}
              handleJobsSearch={handleJobsSearch}
              jobsLoading={jobsLoading}
              queueTotalToday={queueTotalToday}
              queueFilter={queueFilter}
              setQueueFilter={setQueueFilter}
              queueActionMessage={queueActionMessage}
              queueActionError={queueActionError}
              jobsError={jobsError}
              savedJobsError={savedJobsError}
              visibleQueuedJobs={visibleQueuedJobs}
              appliedCount={appliedCount}
              queueReviewedToday={queueReviewedToday}
              queueAppliedToday={queueAppliedToday}
              quickSettingsRef={quickSettingsRef}
              filteredQueuedJobs={filteredQueuedJobs}
              queueProgressLabel={queueProgressLabel}
              queueProgressPercent={queueProgressPercent}
              queueStackJobs={queueStackJobs}
              activeQueueJob={activeQueueJob}
              handleManualApplyStart={handleManualApplyStart}
              handleMarkApplied={handleMarkApplied}
              applyingJobId={applyingJobId}
              appliedJobId={appliedJobId}
              handleSkipJob={handleSkipJob}
              skippingJobId={skippingJobId}
              swipeOffsetX={swipeOffsetX}
              handleQueueTouchStart={handleQueueTouchStart}
              handleQueueTouchMove={handleQueueTouchMove}
              handleQueueTouchEnd={handleQueueTouchEnd}
            />

            <ApplicationsSection
              ControlCenterSection={ControlCenterSection}
              InterviewPrepWorkspace={InterviewPrepWorkspace}
              OfferNegotiationWorkspace={OfferNegotiationWorkspace}
              applicationsSectionSummary={applicationsSectionSummary}
              appliedCount={appliedCount}
              activeControlSection={activeControlSection}
              goToDashboardTab={goToDashboardTab}
              applicationRetryMessage={applicationRetryMessage}
              applicationRetryError={applicationRetryError}
              applicationAnalytics={applicationAnalytics}
              applicationsWithContext={applicationsWithContext}
              updatingApplicationId={updatingApplicationId}
              updateApplicationStatus={updateApplicationStatus}
              canRetryApplication={canRetryApplication}
              handleRetryApplication={handleRetryApplication}
              retryingApplicationId={retryingApplicationId}
              interviewApplications={interviewApplications}
              activeInterviewApplication={activeInterviewApplication}
              interviewPrepRefreshingId={interviewPrepRefreshingId}
              loadInterviewPrep={loadInterviewPrep}
              activeInterviewApplicationId={activeInterviewApplicationId}
              setActiveInterviewApplicationId={setActiveInterviewApplicationId}
              activeInterviewJob={activeInterviewJob}
              activeInterviewPrep={activeInterviewPrep}
              interviewPrepLoadingId={interviewPrepLoadingId}
              interviewPrepError={interviewPrepError}
              interviewAnswerDrafts={interviewAnswerDrafts}
              evaluatingInterviewQuestionKey={evaluatingInterviewQuestionKey}
              recordingInterviewQuestionKey={recordingInterviewQuestionKey}
              updateInterviewAnswerDraft={updateInterviewAnswerDraft}
              handleEvaluateInterviewAnswer={handleEvaluateInterviewAnswer}
              handleStartVoiceInterviewAnswer={handleStartVoiceInterviewAnswer}
              offerApplications={offerApplications}
              activeOfferApplication={activeOfferApplication}
              handlePrepareOfferStrategy={handlePrepareOfferStrategy}
              offerActionLoadingKey={offerActionLoadingKey}
              activeOfferApplicationId={activeOfferApplicationId}
              setActiveOfferApplicationId={setActiveOfferApplicationId}
              activeOfferJob={activeOfferJob}
              activeOfferStrategy={activeOfferStrategy}
              offerStrategyLoadingId={offerStrategyLoadingId}
              offerStrategyError={offerStrategyError}
              offerDrafts={offerDrafts}
              counterGoalDrafts={counterGoalDrafts}
              updateOfferDraft={updateOfferDraft}
              updateCounterGoalDraft={updateCounterGoalDraft}
              handleGenerateCounterResponse={handleGenerateCounterResponse}
              handleFinalizeOffer={handleFinalizeOffer}
              handleCopyText={handleCopyText}
              applicationsError={applicationsError}
              applicationsLoading={applicationsLoading}
              generatedCoverLetterJobs={generatedCoverLetterJobs}
              coverLetterEdits={coverLetterEdits}
              updateCoverLetterEdit={updateCoverLetterEdit}
            />

            <ResumeSection
              ControlCenterSection={ControlCenterSection}
              resumeSectionSummary={resumeSectionSummary}
              activeControlSection={activeControlSection}
              goToDashboardTab={goToDashboardTab}
              resumeVaultText={resumeVaultText}
              applicationAnalytics={applicationAnalytics}
              setResumeVaultText={setResumeVaultText}
              handleSaveResumeVault={handleSaveResumeVault}
              resumeVaultSaving={resumeVaultSaving}
              resumeVaultLoading={resumeVaultLoading}
              handleDeleteResumeVault={handleDeleteResumeVault}
              resumeVaultError={resumeVaultError}
              resumeVaultMessage={resumeVaultMessage}
              tailoredResumeJobs={tailoredResumeJobs}
            />

            <PreferencesSection
              ControlCenterSection={ControlCenterSection}
              settingsSectionSummary={settingsSectionSummary}
              activeControlSection={activeControlSection}
              goToDashboardTab={goToDashboardTab}
              handleSavePreferences={handleSavePreferences}
              preferencesSaving={preferencesSaving}
              jobRole={jobRole}
              setJobRole={setJobRole}
              jobLocation={jobLocation}
              setJobLocation={setJobLocation}
              workTypes={workTypes}
              setWorkTypes={setWorkTypes}
              careerDna={careerDna}
              hardSkills={hardSkills}
              softSkills={softSkills}
              setCareerInterviewOpen={setCareerInterviewOpen}
              setCareerInterviewStep={setCareerInterviewStep}
              careerInterviewCompletedAt={careerInterviewCompletedAt}
              successfulReferrals={successfulReferrals}
              freeMonthsEarned={freeMonthsEarned}
              bonusWeeksGranted={bonusWeeksGranted}
              referralLoading={referralLoading}
              referralLink={referralLink}
              handleInviteFriends={handleInviteFriends}
              handleCopyReferralLink={handleCopyReferralLink}
              connections={connections}
              connectionsLoading={connectionsLoading}
              connectionsError={connectionsError}
              inviteMessage={inviteMessage}
              referralError={referralError}
              sourceCatalogLoading={sourceCatalogLoading}
              sourceCatalogError={sourceCatalogError}
              groupedSourceCatalog={groupedSourceCatalog}
              activeDashboardTab={activeDashboardTab}
              user={user}
              applicationsLimit={applicationsLimit}
              planUsagePercent={planUsagePercent}
              applicationsUsed={applicationsUsed}
            />
          </main>
        </section>
        </>
        )}

        <ControlCenterSection
          title="Advanced Studio"
          subtitle="Manual resume tailoring and cover letter generation stay here when you want deeper control."
          summary="Open the manual AI tools only when you need them."
          open={advancedStudioOpen}
          onToggle={() => setAdvancedStudioOpen((prev) => !prev)}
          actionLabel="Open Tools"
          onAction={() => setAdvancedStudioOpen(true)}
        >
          <section className="hf-panel hf-command-footer">
          <div className="hf-content-grid">
              <div className="hf-panel hf-panel-nested">
                <div className="hf-panel-header">
                  <h3>Resume Tailor</h3>
                  <p>Upload a PDF or paste your resume, then compare the tailored version against the original.</p>
                </div>

                <div className="hf-field-block">
                  <label className="hf-label">Resume Upload</label>
                  <input
                    className="hf-input"
                    type="file"
                    accept=".pdf,.txt,.md"
                    onChange={handleResumeUpload}
                  />
                  <p className="hf-muted-line">
                    {resumeUploadLoading
                      ? "Reading resume file..."
                      : resumeFileName
                        ? `Loaded: ${resumeFileName}`
                        : "Upload a PDF or paste resume text below."}
                  </p>
                </div>

                <div className="hf-field-block">
                  <label className="hf-label">Original Resume</label>
                  <textarea
                    className="hf-textarea"
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                    placeholder="Paste your full resume here"
                  />
                </div>

                <div className="hf-field-block">
                  <label className="hf-label">Job Description</label>
                  <textarea
                    className="hf-textarea"
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the target job description here"
                  />
                </div>

                <button className="hf-btn hf-btn-primary hf-full-btn" onClick={handleResumeTailor} disabled={resumeLoading}>
                  {resumeLoading ? "Generating..." : "Generate Tailored Resume"}
                </button>

                {resumeLoading ? <p className="hf-status-note">Generating a tailored version for this job description...</p> : null}
                {resumeSuccess ? <p className="hf-success">{resumeSuccess}</p> : null}
                {resumeError ? <p className="hf-error">{resumeError}</p> : null}
                {resumeError && isTimeoutErrorMessage(resumeError) ? (
                  <button className="hf-btn hf-btn-secondary hf-full-btn" onClick={handleResumeTailor} disabled={resumeLoading}>
                    Retry Resume Tailor
                  </button>
                ) : null}
              </div>

              <div className="hf-panel hf-output-panel hf-panel-nested">
                <div className="hf-panel-header">
                  <h3>Tailored Resume Output</h3>
                  <p>Review the optimized draft, score, keywords, and export it as a PDF.</p>
                </div>
                {resumeLoading ? <p className="hf-status-note">HireFlow is tailoring your resume now.</p> : null}
                {resumeSuccess ? <p className="hf-success">Tailored resume generated successfully.</p> : null}
                {resumeError ? <p className="hf-error">{resumeError}</p> : null}
                {tailoredResume ? (
                  <div className="hf-resume-result-stack">
                    <div className="hf-resume-insights">
                      <CircularScore score={resumeMatchScore} />
                      <div className="hf-resume-insight-copy">
                        <strong>ATS Match Score</strong>
                        <p>{resumeMatchScore}% match for this job description.</p>
                        <div className="hf-panel-actions">
                          <button
                            className="hf-btn hf-btn-secondary"
                            onClick={() => handleCopyText(tailoredResume, "Tailored resume copied.")}
                          >
                            Copy Resume
                          </button>
                          <button className="hf-btn hf-btn-secondary" onClick={handleDownloadTailoredResumePdf}>
                            Download as PDF
                          </button>
                        </div>
                      </div>
                    </div>

                    {resumeKeywordsAdded.length ? (
                      <div className="hf-field-block">
                        <label className="hf-label">Keywords Added</label>
                        <div className="hf-chip-row">
                          {resumeKeywordsAdded.map((keyword) => (
                            <span className="hf-chip hf-chip-green" key={keyword}>
                              {keyword}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {resumeImprovements.length ? (
                      <div className="hf-field-block">
                        <label className="hf-label">Improvement Summary</label>
                        <div className="hf-summary-list">
                          {resumeImprovements.map((item) => (
                            <div className="hf-summary-item" key={item}>
                              {item}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="hf-compare-grid">
                      <div className="hf-compare-card">
                        <div className="hf-panel-header">
                          <h3>Original Resume</h3>
                        </div>
                        <pre className="hf-output-box hf-output-box-compact">
                          {resumeText || "Your original resume will appear here."}
                        </pre>
                      </div>

                      <div className="hf-compare-card">
                        <div className="hf-panel-header">
                          <h3>Tailored Resume</h3>
                        </div>
                        <pre className="hf-output-box hf-output-box-compact">
                          {tailoredResume}
                        </pre>
                      </div>
                    </div>
                  </div>
                ) : resumeLoading ? (
                  <div className="hf-output-loading">
                    <div className="hf-route-spinner" />
                    <p>Generating your tailored resume...</p>
                    <small>We’re optimizing your resume, match score, and keyword fit.</small>
                  </div>
                ) : (
                  <pre className="hf-output-box">Your tailored resume will appear here once generation finishes.</pre>
                )}
              </div>

              <div className="hf-panel hf-panel-nested">
                <div className="hf-panel-header">
                  <h3>Cover Letter Generator</h3>
                  <p>Generate a sharper, more human cover letter and refine it before sending.</p>
                </div>

                <div className="hf-field-block">
                  <label className="hf-label">Resume Text</label>
                  <textarea
                    className="hf-textarea"
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                    placeholder="Paste your full resume here"
                  />
                </div>

                <div className="hf-field-block">
                  <label className="hf-label">Job Description</label>
                  <textarea
                    className="hf-textarea"
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the target job description here"
                  />
                </div>

                <div className="hf-two-col">
                  <div className="hf-field-block">
                    <label className="hf-label">Company Name</label>
                    <input
                      className="hf-input"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Company name"
                    />
                  </div>

                  <div className="hf-field-block">
                    <label className="hf-label">Job Title</label>
                    <input
                      className="hf-input"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder="Backend Engineer"
                    />
                  </div>
                </div>

                <button className="hf-btn hf-btn-primary hf-full-btn" onClick={handleCoverLetterGenerate} disabled={coverLoading}>
                  {coverLoading ? "Generating..." : "Generate Cover Letter"}
                </button>

                {coverLoading ? <p className="hf-status-note">Generating a tailored cover letter for this role...</p> : null}
                {coverSuccess ? <p className="hf-success">{coverSuccess}</p> : null}
                {coverError ? <p className="hf-error">{coverError}</p> : null}
                {coverError && isTimeoutErrorMessage(coverError) ? (
                  <button className="hf-btn hf-btn-secondary hf-full-btn" onClick={handleCoverLetterGenerate} disabled={coverLoading}>
                    Retry Cover Letter
                  </button>
                ) : null}
              </div>

              <div className="hf-panel hf-output-panel hf-panel-nested">
                <div className="hf-panel-header">
                  <h3>Cover Letter Draft</h3>
                  <p>Preview, copy, edit, or regenerate the letter before sending.</p>
                </div>
                {coverLoading ? <p className="hf-status-note">HireFlow is writing your cover letter now.</p> : null}
                {coverSuccess ? <p className="hf-success">Cover letter generated successfully.</p> : null}
                {coverError ? <p className="hf-error">{coverError}</p> : null}
                {coverLoading ? (
                  <div className="hf-output-loading">
                    <div className="hf-route-spinner" />
                    <p>Generating your cover letter...</p>
                    <small>We’re shaping a concise, role-specific draft you can send or edit.</small>
                  </div>
                ) : coverLetter ? (
                  <div className="hf-cover-letter-stack">
                    <div className="hf-panel-actions">
                      <button
                        className="hf-btn hf-btn-secondary"
                        onClick={() => handleCopyText(coverLetterDraft || coverLetter, "Cover letter copied.")}
                      >
                        Copy to Clipboard
                      </button>
                      <button
                        className="hf-btn hf-btn-secondary"
                        onClick={handleDownloadCoverLetterPdf}
                      >
                        Download as PDF
                      </button>
                      <button
                        className="hf-btn hf-btn-ghost"
                        onClick={() => setCoverLetterEditMode((prev) => !prev)}
                      >
                        {coverLetterEditMode ? "Preview Mode" : "Edit Before Sending"}
                      </button>
                      <button className="hf-btn hf-btn-primary" onClick={handleCoverLetterGenerate} disabled={coverLoading}>
                        {coverLoading ? "Regenerating..." : "Regenerate"}
                      </button>
                      <button
                        className="hf-btn hf-btn-ghost"
                        onClick={() => {
                          setCoverLetter("");
                          setCoverLetterDraft("");
                          setCoverLetterEditMode(false);
                        }}
                      >
                        Clear
                      </button>
                    </div>

                    {coverLetterEditMode ? (
                      <textarea
                        className="hf-textarea hf-cover-letter-editor"
                        value={coverLetterDraft}
                        onChange={(e) => setCoverLetterDraft(e.target.value)}
                        placeholder="Edit your cover letter before sending"
                      />
                    ) : (
                      <div
                        className="hf-cover-letter-preview"
                        style={{
                          fontFamily: "Georgia, serif",
                          fontSize: "15px",
                          lineHeight: "1.8",
                          whiteSpace: "pre-wrap",
                          padding: "24px",
                        }}
                      >
                        {coverLetterDraft || coverLetter || "Your cover letter will appear here."}
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    className="hf-cover-letter-preview"
                    style={{
                      fontFamily: "Georgia, serif",
                      fontSize: "15px",
                      lineHeight: "1.8",
                      whiteSpace: "pre-wrap",
                      padding: "24px",
                    }}
                  >
                    {coverLetter || "Your cover letter will appear here once generation finishes."}
                  </div>
                )}
              </div>
            </div>
          </section>
        </ControlCenterSection>
      </div>

      {careerInterviewOpen ? (
        <CareerInterviewModal
          answers={careerInterviewAnswers}
          step={careerInterviewStep}
          onStepChange={setCareerInterviewStep}
          onAnswerChange={(key, value) =>
            setCareerInterviewAnswers((prev) => ({
              ...prev,
              [key]: value,
            }))
          }
          onClose={() => {
            if (careerInterviewCompletedAt) {
              setCareerInterviewOpen(false);
            }
          }}
          onSubmit={handleSaveCareerInterview}
          loading={careerInterviewLoading}
          error={careerInterviewError}
          progress={careerInterviewProgress}
          completed={Boolean(careerInterviewCompletedAt)}
        />
      ) : null}
    </div>
  );

  if (appLoading) {
    return <LoadingScreen message={hasStoredToken ? "Checking your session..." : "Loading HireFlow AI..."} />;
  }

  const protectedDashboardElement = (
    <ErrorBoundary>
      {bootError ? bootErrorPage : dashboardShell}
    </ErrorBoundary>
  );

  return (
    <>
    <Routes>
      <Route path="/" element={authScreenPage} />
      <Route path="/login" element={hasStoredToken && bootLoading ? loadingPage : user ? <Navigate to="/dashboard" replace /> : authScreenPage} />
      <Route path="/register" element={hasStoredToken && bootLoading ? loadingPage : user ? <Navigate to="/dashboard" replace /> : authScreenPage} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute isCheckingAuth={hasStoredToken && bootLoading} isAuthenticated={Boolean(user)}>
            {protectedDashboardElement}
          </ProtectedRoute>
        }
      />
      <Route
        path="/jobs"
        element={
          <ProtectedRoute isCheckingAuth={hasStoredToken && bootLoading} isAuthenticated={Boolean(user)}>
            {protectedDashboardElement}
          </ProtectedRoute>
        }
      />
      <Route
        path="/resume"
        element={
          <ProtectedRoute isCheckingAuth={hasStoredToken && bootLoading} isAuthenticated={Boolean(user)}>
            {protectedDashboardElement}
          </ProtectedRoute>
        }
      />
      <Route
        path="/cover-letter"
        element={
          <ProtectedRoute isCheckingAuth={hasStoredToken && bootLoading} isAuthenticated={Boolean(user)}>
            {protectedDashboardElement}
          </ProtectedRoute>
        }
      />
      <Route
        path="/applications"
        element={
          <ProtectedRoute isCheckingAuth={hasStoredToken && bootLoading} isAuthenticated={Boolean(user)}>
            {protectedDashboardElement}
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute isCheckingAuth={hasStoredToken && bootLoading} isAuthenticated={Boolean(user)}>
            {protectedDashboardElement}
          </ProtectedRoute>
        }
      />
      <Route
        path="/billing"
        element={
          <ProtectedRoute isCheckingAuth={hasStoredToken && bootLoading} isAuthenticated={Boolean(user)}>
            {protectedDashboardElement}
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFoundPage isAuthenticated={hasStoredToken || Boolean(user)} />} />
    </Routes>
      {toast ? <Toast message={toast.message} type={toast.type} /> : null}
    </>
  );
}

function StatCard({ label, value, meta = "" }) {
  return (
    <div className="hf-stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {meta ? <small>{meta}</small> : null}
    </div>
  );
}

function getPipelineLaneDescription(title = "") {
  const normalized = String(title || "").trim().toLowerCase();

  if (normalized === "applied") return "HireFlow completed and recorded these applications.";
  if (normalized === "ready") return "These jobs are ready for HireFlow to apply.";
  if (normalized === "manual action needed") return "These jobs still need you to finish the application.";
  if (normalized === "failed") return "These application attempts need a retry or manual follow-up.";

  return "These jobs are currently in this stage of your pipeline.";
}

function PipelineLane({ title, count, jobs = [], tone = "dark" }) {
  return (
    <div className="hf-pipeline-lane">
      <div className="hf-pipeline-lane-head">
        <span className={`hf-chip ${getToneChipClass(tone)}`}>{title}</span>
        <strong>{count}</strong>
      </div>
      <p className="hf-pipeline-lane-copy">{getPipelineLaneDescription(title)}</p>
      <div className="hf-pipeline-lane-body">
        {jobs.length ? (
          jobs.slice(0, 4).map((job) => (
            <div className="hf-pipeline-lane-card" key={job._id}>
              <strong>{job.title || "Untitled role"}</strong>
              <p>{job.company || "Unknown company"}</p>
              <span>{formatRelativeTime(job.appliedAt || job.manualApplyStartedAt || job.createdAt)}</span>
            </div>
          ))
        ) : (
          <div className="hf-empty-card hf-empty-card-compact">Review your job matches to start filling this stage.</div>
        )}
      </div>
    </div>
  );
}

function IntelligenceCard({ title, value, detail }) {
  return (
    <div className="hf-intelligence-card">
      <span>{title}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </div>
  );
}

function InterviewPrepWorkspace({
  application,
  job,
  prep,
  loading,
  error,
  answerDrafts,
  evaluatingKey,
  recordingKey,
  onAnswerChange,
  onSubmitAnswer,
  onVoiceAnswer,
}) {
  const groupedQuestions = useMemo(
    () => [
      {
        key: "technical",
        title: "Technical",
        items: Array.isArray(prep?.likelyQuestions?.technical) ? prep.likelyQuestions.technical : [],
      },
      {
        key: "behavioral",
        title: "Behavioral",
        items: Array.isArray(prep?.likelyQuestions?.behavioral) ? prep.likelyQuestions.behavioral : [],
      },
      {
        key: "companyNews",
        title: "Company News",
        items: Array.isArray(prep?.likelyQuestions?.companyNews) ? prep.likelyQuestions.companyNews : [],
      },
    ],
    [prep]
  );
  const flatQuestions = useMemo(
    () =>
      groupedQuestions.flatMap((group) =>
        group.items.map((item) => ({
          ...item,
          groupKey: group.key,
          groupTitle: group.title,
        }))
      ),
    [groupedQuestions]
  );
  const [selectedQuestion, setSelectedQuestion] = useState("");
  const selectedQuestionItem = useMemo(() => {
    if (!flatQuestions.length) {
      return null;
    }

    return flatQuestions.find((item) => item.question === selectedQuestion) || flatQuestions[0];
  }, [flatQuestions, selectedQuestion]);
  const answerKey = selectedQuestionItem ? `${application._id}::${selectedQuestionItem.question}` : "";
  const answerValue = answerKey ? answerDrafts[answerKey] || "" : "";
  const latestAttempt = prep?.practiceHistory?.length ? prep.practiceHistory[prep.practiceHistory.length - 1] : null;

  if (loading) {
    return <div className="hf-interview-panel hf-interview-panel-loading">Building your interview brief...</div>;
  }

  if (!prep) {
    return (
      <div className="hf-interview-panel hf-interview-panel-empty">
        <strong>Interview prep is warming up.</strong>
        <p>Set a role to Interview status and HireFlow will build the prep guide here automatically.</p>
      </div>
    );
  }

  return (
    <div className="hf-interview-panel">
      <div className="hf-interview-hero">
        <div>
          <span className="hf-chip hf-chip-green">Interview Activated</span>
          <h4>{prep.companySnapshot?.headline || `You have an interview at ${application.company || "this company"}.`}</h4>
          <p>
            {prep.preInterviewBrief?.intro ||
              `You’re interviewing for ${application.title || "this role"} at ${application.company || "the company"}.`}
          </p>
        </div>
        <div className="hf-interview-hero-meta">
          <strong>{application.company || job?.company || "Company"}</strong>
          <span>{application.title || job?.title || "Role"}</span>
          <small>{job?.companyIntelligence?.salaryInsight?.label || "Compensation signal loading"}</small>
        </div>
      </div>

      <div className="hf-interview-grid">
        <div className="hf-interview-brief-card">
          <div className="hf-panel-header">
            <h4>Pre-Interview Brief</h4>
            <p>What to know, what to say, and what to ask before the call starts.</p>
          </div>
          <div className="hf-interview-brief-columns">
            <div>
              <span className="hf-label">5 things to know</span>
              <ul className="hf-interview-list">
                {(prep.preInterviewBrief?.fiveThingsToKnow || []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <span className="hf-label">Stories to tell</span>
              <div className="hf-interview-story-list">
                {(prep.preInterviewBrief?.experienceStories || []).map((story) => (
                  <div className="hf-interview-story" key={`${story.title}-${story.talkTrack}`}>
                    <strong>{story.title || "Relevant story"}</strong>
                    <p>{story.talkTrack}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="hf-interview-brief-columns">
            <div>
              <span className="hf-label">Questions you should ask</span>
              <ul className="hf-interview-list">
                {(prep.preInterviewBrief?.questionsToAsk || []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <span className="hf-label">Salary negotiation script</span>
              <div className="hf-interview-script">{prep.preInterviewBrief?.salaryNegotiationScript || "No script yet."}</div>
            </div>
          </div>
        </div>

        <div className="hf-interview-practice-card">
          <div className="hf-panel-header">
            <h4>AI Interviewer</h4>
            <p>Practice by text or voice and get immediate coaching on clarity, confidence, and relevance.</p>
          </div>

          <div className="hf-interview-question-groups">
            {groupedQuestions.map((group) => (
              <div className="hf-interview-question-group" key={group.key}>
                <span className="hf-label">{group.title}</span>
                <div className="hf-interview-question-list">
                  {group.items.map((item) => (
                    <button
                      key={item.question}
                      className={
                        selectedQuestion === item.question
                          ? "hf-interview-question-pill active"
                          : "hf-interview-question-pill"
                      }
                      onClick={() => setSelectedQuestion(item.question)}
                    >
                      {item.question}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {selectedQuestionItem ? (
            <div className="hf-interview-answer-card">
              <div className="hf-interview-question-focus">
                <strong>{selectedQuestionItem.question}</strong>
                <p>{selectedQuestionItem.why}</p>
              </div>

              <textarea
                className="hf-textarea hf-interview-answer-box"
                value={answerValue}
                onChange={(event) => onAnswerChange(application._id, selectedQuestionItem.question, event.target.value)}
                placeholder="Answer this question in your own words. Aim for a concise, outcome-led story."
              />

              <div className="hf-panel-actions">
                <button
                  className="hf-btn hf-btn-primary"
                  onClick={() => onSubmitAnswer(application._id, selectedQuestionItem.question, "text")}
                  disabled={evaluatingKey === answerKey}
                >
                  {evaluatingKey === answerKey ? "Coaching..." : "Get AI Feedback"}
                </button>
                <button
                  className="hf-btn hf-btn-secondary"
                  onClick={() => onVoiceAnswer(application._id, selectedQuestionItem.question)}
                  disabled={recordingKey === answerKey}
                >
                  {recordingKey === answerKey ? "Listening..." : "Answer by Voice"}
                </button>
              </div>
            </div>
          ) : null}

          {latestAttempt?.feedback ? (
            <div className="hf-interview-feedback-card">
              <div className="hf-interview-feedback-head">
                <div>
                  <span className="hf-label">Latest coaching feedback</span>
                  <strong>{latestAttempt.question}</strong>
                </div>
                <div className="hf-interview-score-row">
                  <InterviewFeedbackScore label="Confidence" value={latestAttempt.feedback.scores?.confidence} />
                  <InterviewFeedbackScore label="Clarity" value={latestAttempt.feedback.scores?.clarity} />
                  <InterviewFeedbackScore label="Relevance" value={latestAttempt.feedback.scores?.relevance} />
                </div>
              </div>
              <p>{latestAttempt.feedback.summary}</p>
              <div className="hf-interview-feedback-grid">
                <div>
                  <span className="hf-label">What worked</span>
                  <ul className="hf-interview-list">
                    {(latestAttempt.feedback.strengths || []).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <span className="hf-label">What to improve</span>
                  <ul className="hf-interview-list">
                    {(latestAttempt.feedback.improvements || []).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
              {latestAttempt.feedback.sampleUpgrade ? (
                <div className="hf-interview-script">{latestAttempt.feedback.sampleUpgrade}</div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {error ? <p className="hf-error">{error}</p> : null}
    </div>
  );
}

function InterviewFeedbackScore({ label, value = 0 }) {
  const normalized = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="hf-interview-score">
      <span>{label}</span>
      <strong>{normalized}</strong>
    </div>
  );
}

function OfferNegotiationWorkspace({
  application,
  job,
  strategy,
  loading,
  error,
  draft,
  counterGoal,
  actionLoadingKey,
  onDraftChange,
  onCounterGoalChange,
  onPrepare,
  onCounter,
  onFinalize,
  onCopy,
}) {
  const currency = strategy?.currency || strategy?.marketBenchmark?.currency || job?.salaryCurrency || "INR";
  const benchmark = strategy?.marketBenchmark || null;
  const comparisonTone =
    benchmark?.recommendationStrength === "strong"
      ? "hf-chip hf-chip-green"
      : benchmark?.recommendationStrength === "moderate"
        ? "hf-chip hf-chip-amber"
        : "hf-chip hf-chip-dark";
  const currentOfferValue =
    draft.currentOfferAmount || strategy?.currentOfferAmount || strategy?.initialOfferAmount || "";
  const initialOfferValue = draft.initialOfferAmount || strategy?.initialOfferAmount || "";
  const finalOfferValue = draft.finalOfferAmount || strategy?.finalOfferAmount || "";

  if (loading) {
    return <div className="hf-interview-panel hf-interview-panel-loading">Benchmarking the offer and drafting your negotiation strategy...</div>;
  }

  return (
    <div className="hf-interview-panel hf-offer-panel">
      <div className="hf-interview-hero">
        <div>
          <span className="hf-chip hf-chip-blue">Negotiation Coach</span>
          <h4>{application.company || "This company"} offer intelligence</h4>
          <p>
            {benchmark?.comparisonSummary ||
              "Add the current offer amount and HireFlow will compare it against the best market signals available."}
          </p>
        </div>
        <div className="hf-interview-hero-meta">
          <strong>{application.title || job?.title || "Role"}</strong>
          <span>{application.company || job?.company || "Company"}</span>
          <small>{job?.companyIntelligence?.salaryInsight?.label || "No verified salary feed connected yet"}</small>
        </div>
      </div>

      <div className="hf-offer-grid">
        <div className="hf-offer-card">
          <div className="hf-panel-header">
            <h4>1. Benchmark the offer</h4>
            <p>Enter the package to see whether it is above or below HireFlow’s current market signal.</p>
          </div>
          <div className="hf-two-col">
            <div className="hf-field-block">
              <label className="hf-label">Initial offer amount</label>
              <input
                className="hf-input"
                inputMode="numeric"
                value={initialOfferValue}
                onChange={(event) => onDraftChange(application._id, "initialOfferAmount", event.target.value)}
                placeholder="e.g. 2200000"
              />
            </div>
            <div className="hf-field-block">
              <label className="hf-label">Current offer amount</label>
              <input
                className="hf-input"
                inputMode="numeric"
                value={currentOfferValue}
                onChange={(event) => onDraftChange(application._id, "currentOfferAmount", event.target.value)}
                placeholder="e.g. 2400000"
              />
            </div>
          </div>
          <button
            className="hf-btn hf-btn-primary"
            onClick={() => onPrepare(application._id)}
            disabled={actionLoadingKey === `${application._id}:prepare`}
          >
            {actionLoadingKey === `${application._id}:prepare` ? "Analyzing..." : "Analyze Offer"}
          </button>

          {benchmark ? (
            <div className="hf-offer-summary-card">
              <div className="hf-offer-summary-head">
                <span className={comparisonTone}>
                  {benchmark.recommendationStrength === "strong"
                    ? "You should negotiate"
                    : benchmark.recommendationStrength === "moderate"
                      ? "Worth negotiating"
                      : "Review selectively"}
                </span>
                <strong>{getOfferGapText(benchmark.deltaFromMarket, currency)}</strong>
              </div>
              <p>{benchmark.comparisonSummary}</p>
              <p>{benchmark.recommendation}</p>
              <div className="hf-offer-market-row">
                <div className="hf-offer-market-metric">
                  <span>Market midpoint</span>
                  <strong>{formatCompensation(strategy?.marketBenchmark?.midpoint, currency) || "Unavailable"}</strong>
                </div>
                <div className="hf-offer-market-metric">
                  <span>Market range</span>
                  <strong>
                    {formatCompensation(strategy?.marketBenchmark?.min, currency) && formatCompensation(strategy?.marketBenchmark?.max, currency)
                      ? `${formatCompensation(strategy?.marketBenchmark?.min, currency)} - ${formatCompensation(strategy?.marketBenchmark?.max, currency)}`
                      : "Directional only"}
                  </strong>
                </div>
              </div>
              <div className="hf-chip-row">
                {(benchmark.sources || []).map((source) => (
                  <span
                    className={source.status === "used" ? "hf-chip hf-chip-green" : "hf-chip hf-chip-dark"}
                    key={`${source.name}-${source.status}`}
                    title={source.note}
                  >
                    {source.name}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="hf-offer-card">
          <div className="hf-panel-header">
            <h4>2. Send the negotiation reply</h4>
            <p>HireFlow gives you exact wording you can copy into your email reply.</p>
          </div>
          <div className="hf-offer-script-box">
            {strategy?.negotiationScript || "Your negotiation script will appear here after benchmarking the offer."}
          </div>
          <div className="hf-panel-actions">
            <button
              className="hf-btn hf-btn-secondary"
              onClick={() => onCopy(strategy?.negotiationScript || "", "Negotiation script copied.")}
              disabled={!strategy?.negotiationScript}
            >
              Copy Script
            </button>
          </div>

          <div className="hf-field-block">
            <label className="hf-label">If they counter, what outcome are you targeting?</label>
            <textarea
              className="hf-textarea"
              value={counterGoal}
              onChange={(event) => onCounterGoalChange(application._id, event.target.value)}
              placeholder="e.g. I want to push for 26 LPA or stronger joining bonus/equity."
            />
          </div>

          <button
            className="hf-btn hf-btn-primary"
            onClick={() => onCounter(application._id)}
            disabled={actionLoadingKey === `${application._id}:counter`}
          >
            {actionLoadingKey === `${application._id}:counter` ? "Writing..." : "Generate Next Response"}
          </button>

          {strategy?.counterResponseScript ? (
            <div className="hf-offer-script-box">
              {strategy.counterResponseScript}
            </div>
          ) : null}
        </div>
      </div>

      <div className="hf-offer-card hf-offer-card-wide">
        <div className="hf-panel-header">
          <h4>3. Track the negotiation win</h4>
          <p>Record the final outcome so HireFlow can show the uplift from the first offer.</p>
        </div>
        <div className="hf-two-col">
          <div className="hf-field-block">
            <label className="hf-label">Final accepted offer amount</label>
            <input
              className="hf-input"
              inputMode="numeric"
              value={finalOfferValue}
              onChange={(event) => onDraftChange(application._id, "finalOfferAmount", event.target.value)}
              placeholder="e.g. 2650000"
            />
          </div>
          <div className="hf-offer-win-card">
            <span className="hf-label">Negotiation result</span>
            <strong>{getNegotiationWinText(strategy?.upliftAmount, currency)}</strong>
            <p>
              {strategy?.upliftAmount > 0
                ? `HireFlow helped you negotiate ${formatCompensation(strategy.upliftAmount, currency)} more than the first offer.`
                : "No uplift recorded yet."}
            </p>
          </div>
        </div>
        <div className="hf-panel-actions">
          <button
            className="hf-btn hf-btn-primary"
            onClick={() => onFinalize(application._id)}
            disabled={actionLoadingKey === `${application._id}:finalize`}
          >
            {actionLoadingKey === `${application._id}:finalize` ? "Saving..." : "Save Final Offer"}
          </button>
        </div>
        {error ? <p className="hf-error">{error}</p> : null}
      </div>
    </div>
  );
}

function CircularScore({ score = 0 }) {
  const normalized = Math.max(0, Math.min(100, Number(score) || 0));
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - normalized / 100 * circumference;

  return (
    <div className="hf-score-ring">
      <svg viewBox="0 0 120 120" className="hf-score-ring-svg" aria-label={`Match score ${normalized}%`}>
        <circle cx="60" cy="60" r={radius} className="hf-score-ring-track" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          className="hf-score-ring-fill"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="hf-score-ring-copy">
        <strong>{normalized}%</strong>
        <span>Match</span>
      </div>
    </div>
  );
}

function SectionCard({ sectionKey, title, subtitle, expanded, onToggle, status, summary = [], children }) {
  return (
    <section
      id={`section-${sectionKey}`}
      className={expanded ? "hf-panel hf-section-card expanded" : "hf-panel hf-section-card"}
    >
      <button className="hf-section-toggle" onClick={onToggle}>
        <div className="hf-section-toggle-copy">
          <h3>{title}</h3>
          <p>{subtitle}</p>
          {summary.length ? (
            <div className="hf-section-summary">
              {summary.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          ) : null}
        </div>
        <div className="hf-section-toggle-meta">
          {status ? <span className="hf-section-badge">{status}</span> : null}
          <span className="hf-section-icon">{expanded ? "−" : "+"}</span>
        </div>
      </button>

      {expanded ? <div className="hf-section-body">{children}</div> : null}
    </section>
  );
}

function PipelineBucket({ title, count, empty, children }) {
  return (
    <div className="hf-pipeline-bucket">
      <div className="hf-pipeline-head">
        <h4>{title}</h4>
        <span>{count}</span>
      </div>

      <div className="hf-pipeline-body">
        {count === 0 ? <div className="hf-empty-card hf-empty-card-compact">{empty}</div> : children}
      </div>
    </div>
  );
}

function JobSkeleton() {
  return (
    <div className="hf-job-card hf-job-card-skeleton" aria-hidden="true">
      <div className="hf-job-content">
        <div className="hf-skeleton hf-skeleton-title" />
        <div className="hf-skeleton hf-skeleton-subtitle" />
        <div className="hf-chip-row">
          <div className="hf-skeleton hf-skeleton-chip" />
          <div className="hf-skeleton hf-skeleton-chip" />
          <div className="hf-skeleton hf-skeleton-chip" />
        </div>
        <div className="hf-skeleton hf-skeleton-line" />
        <div className="hf-skeleton hf-skeleton-line" />
        <div className="hf-skeleton hf-skeleton-line short" />
        <div className="hf-job-actions">
          <div className="hf-skeleton hf-skeleton-button" />
          <div className="hf-skeleton hf-skeleton-button" />
        </div>
      </div>
    </div>
  );
}

function JobCard({
  job,
  exiting,
  onStartManualApply,
  onMarkApplied,
  applying,
  appliedSuccess,
  onSkip,
  skipping,
  swipeOffsetX = 0,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
}) {
  const score10 = Number(job.aiScore10 || 0);
  const isManual = isManualActionJob(job);
  const manualInProgress = Boolean(job.manualApplyInProgress);
  const statusPresentation = getJobStatusPresentation(job);
  const workMode = getJobWorkMode(job);
  const jobLink = job.applyUrl || job.jobUrl || "";
  const primaryAction = isManual && !manualInProgress ? onStartManualApply : onMarkApplied;
  const primaryLabel = applying
    ? "Applying..."
    : appliedSuccess
      ? "Applied by HireFlow ✓"
      : isManual && manualInProgress
        ? "✓ Mark Applied"
        : isManual
          ? "Finish Application"
          : "Apply by HireFlow";
  const cardStyle = swipeOffsetX
    ? {
        transform: `translateX(${swipeOffsetX}px) rotate(${swipeOffsetX / 24}deg)`,
      }
    : undefined;

  const cardClasses = [
    "hf-job-card",
    "hf-queue-card-top",
    appliedSuccess ? "hf-job-card-applied" : "",
    exiting === "left" ? "hf-job-card-exit-left" : "",
    exiting === "right" ? "hf-job-card-exit-right" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={cardClasses}
      style={cardStyle}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="hf-job-content">
        <div className="hf-job-top">
          <div className="hf-job-headline">
            <h4>{job.title || "Untitled role"}</h4>
            <p className="hf-job-company">{job.company || "Unknown company"}</p>
          </div>

          <MatchScore score={score10} breakdown={job.aiScoreBreakdown || null} />
        </div>

        <div className="hf-job-subrow">
          <p className="hf-job-meta">
            <span className="hf-job-meta-icon" aria-hidden="true">📍</span>
            <span>{job.location || "Location not specified"}</span>
            <span className="hf-job-meta-separator" aria-hidden="true">•</span>
            <span>{workMode}</span>
          </p>

          {jobLink ? (
            <a className="hf-job-link" href={jobLink} target="_blank" rel="noreferrer">
              View Job ↗
            </a>
          ) : null}
        </div>

        <div className="hf-chip-row hf-job-status-row">
          <span className={statusPresentation.className} title={statusPresentation.reason}>
            {statusPresentation.label}
          </span>
        </div>
        <p className="hf-job-status-copy">{statusPresentation.reason}</p>

        <div className="hf-job-actions">
          {primaryAction ? (
            <button
              className={appliedSuccess ? "hf-btn hf-btn-success hf-btn-job-primary" : "hf-btn hf-btn-primary hf-btn-job-primary"}
              onClick={primaryAction}
              disabled={applying || appliedSuccess}
            >
              {primaryLabel}
            </button>
          ) : null}

          {onSkip ? (
            <button className="hf-btn hf-btn-job-secondary" onClick={onSkip} disabled={skipping}>
              {skipping ? "Skipping..." : "✕ Skip"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function QueuePreviewCard({ job, depth = 1 }) {
  const score10 = Number(job.aiScore10 || 0);

  return (
    <div className={`hf-job-card hf-queue-preview-card depth-${depth}`}>
      <div className="hf-job-content">
        <div className="hf-job-top">
          <div className="hf-job-headline">
            <h4>{job.title || "Untitled role"}</h4>
            <p className="hf-job-company">{job.company || "Unknown company"}</p>
          </div>

          <MatchScore score={score10} breakdown={job.aiScoreBreakdown || null} />
        </div>
      </div>
    </div>
  );
}

function QueueStateCard({
  icon,
  title,
  subtitle,
  secondaryText = "",
  actionLabel = "",
  onAction = null,
  variant = "default",
}) {
  return (
    <div className={variant === "success" ? "hf-queue-state-card hf-queue-state-card-success" : "hf-queue-state-card"}>
      <div className={variant === "success" ? "hf-queue-state-icon hf-queue-state-icon-success" : "hf-queue-state-icon"}>
        {icon}
      </div>
      <h4>{title}</h4>
      <p>{subtitle}</p>
      {secondaryText ? <p className="hf-queue-state-secondary">{secondaryText}</p> : null}
      {actionLabel && onAction ? (
        <button className={variant === "success" ? "hf-btn hf-btn-primary" : "hf-btn hf-btn-secondary"} onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

function Toast({ message, type = "success" }) {
  return (
    <div
      style={{
        position: "fixed",
        right: "20px",
        bottom: "20px",
        background: type === "error" ? "#ef4444" : "#22c55e",
        color: "#ffffff",
        padding: "12px 20px",
        borderRadius: "8px",
        zIndex: 9999,
        fontSize: "14px",
        fontWeight: 600,
        boxShadow: "0 12px 30px rgba(15, 23, 42, 0.18)",
      }}
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  );
}

function LoadingScreen({ message = "Loading your dashboard..." }) {
  return (
    <div className="hf-loading-screen" role="status" aria-live="polite">
      <div className="hf-loading-screen-card">
        <div className="hf-loading-brand">
          <div className="hf-brand-mark">H</div>
          <div className="hf-loading-brand-copy">
            <span className="hf-brand-eyebrow">HireFlow AI</span>
            <strong>HireFlow AI</strong>
          </div>
        </div>
        <div className="hf-loading-spinner" aria-hidden="true" />
        <p>{message}</p>
      </div>
    </div>
  );
}

function DashboardStatSkeleton() {
  return (
    <div className="hf-stat-card hf-stat-card-skeleton" aria-hidden="true">
      <div className="hf-skeleton hf-skeleton-subtitle" />
      <div className="hf-skeleton hf-skeleton-title" />
      <div className="hf-skeleton hf-skeleton-line short" />
    </div>
  );
}

function RecentApplicationSkeleton() {
  return (
    <div className="hf-recent-app-card hf-recent-app-card-skeleton" aria-hidden="true">
      <div className="hf-recent-app-copy">
        <div className="hf-skeleton hf-skeleton-subtitle" />
        <div className="hf-skeleton hf-skeleton-line short" />
      </div>
      <div className="hf-recent-app-meta">
        <div className="hf-skeleton hf-skeleton-chip" />
        <div className="hf-skeleton hf-skeleton-chip" />
      </div>
    </div>
  );
}

function DashboardInlineState({ icon, title, subtitle, actionLabel = "", onAction = null }) {
  return (
    <div className="hf-dashboard-inline-state">
      <div className="hf-dashboard-inline-icon">{icon}</div>
      <strong>{title}</strong>
      <p>{subtitle}</p>
      {actionLabel && onAction ? (
        <button className="hf-btn hf-btn-secondary" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

function ControlCenterSection({
  title,
  subtitle,
  summary,
  open = false,
  onToggle,
  actionLabel = "",
  onAction = null,
  actionDisabled = false,
  children,
}) {
  return (
    <section className={open ? "hf-control-section hf-control-section-open" : "hf-control-section"}>
      <div className="hf-control-section-head">
        <button className="hf-control-section-toggle" onClick={onToggle} type="button">
          <div className="hf-control-section-copy">
            <strong>{title}</strong>
            <p>{open ? subtitle : summary}</p>
          </div>
          <span className={open ? "hf-control-chevron hf-control-chevron-open" : "hf-control-chevron"} aria-hidden="true">
            ▾
          </span>
        </button>
        {actionLabel && onAction ? (
          <button className="hf-btn hf-btn-secondary hf-btn-small" onClick={onAction} disabled={actionDisabled} type="button">
            {actionLabel}
          </button>
        ) : null}
      </div>
      {open ? <div className="hf-control-section-body">{children}</div> : null}
    </section>
  );
}

function RouteLoadingScreen() {
  return <LoadingScreen message="Loading your dashboard..." />;
}

function ProtectedRoute({ children, isCheckingAuth = false, isAuthenticated = false }) {
  const token = getStoredToken();

  if (isCheckingAuth) {
    return <RouteLoadingScreen />;
  }

  if (!token || !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function NotFoundPage({ isAuthenticated = false }) {
  const navigate = useNavigate();

  return (
    <div className="hf-page">
      <div className="hf-loading-card hf-error-card">
        <h2>Page not found</h2>
        <p>The page you were looking for doesn&apos;t exist.</p>
        <button
          className="hf-btn hf-btn-primary"
          onClick={() => navigate(isAuthenticated ? "/dashboard" : "/", { replace: true })}
        >
          Go to dashboard
        </button>
      </div>
    </div>
  );
}

function TagList({ items, onRemove }) {
  if (!items.length) {
    return <p className="hf-muted-line">No items added yet.</p>;
  }

  return (
    <div className="hf-chip-row hf-tag-list">
      {items.map((item) => (
        <span className="hf-chip hf-chip-dark hf-chip-removable" key={item}>
          {item}
          <button onClick={() => onRemove(item)}>x</button>
        </span>
      ))}
    </div>
  );
}

function isManualActionJob(job) {
  return Boolean(job?.manualActionRequired || job?.manualActionNeeded);
}

function isReadyToApplyJob(job) {
  return Boolean(
    !isManualActionJob(job) &&
      (job?.sourceCapabilities?.autoApplySupported || (job?.tailoredResumeText && job?.coverLetterText))
  );
}

function getJobWorkMode(job) {
  const explicitWorkType = String(job?.workType || job?.workMode || "").trim().toLowerCase();
  const locationText = String(job?.location || "").toLowerCase();

  if (explicitWorkType.includes("hybrid") || locationText.includes("hybrid")) {
    return "Hybrid";
  }

  if (
    explicitWorkType.includes("onsite") ||
    explicitWorkType.includes("on-site") ||
    explicitWorkType.includes("office") ||
    locationText.includes("onsite") ||
    locationText.includes("on-site")
  ) {
    return "Onsite";
  }

  if (job?.remote || explicitWorkType.includes("remote") || locationText.includes("remote")) {
    return "Remote";
  }

  return "Onsite";
}

function getPlanApplicationLimit(plan) {
  if (plan === "auto") return Infinity;
  if (plan === "pro") return 100;
  return 5;
}

function formatPlanName(plan = "") {
  const normalized = String(plan || "free").trim().toLowerCase();

  if (normalized === "pro") return "Pro";
  if (normalized === "auto") return "Auto";
  return "Free";
}

function getLifecycleStatusClass(status = "") {
  const normalized = String(status || "Applied").trim().toLowerCase();

  if (normalized === "interview" || normalized === "offer") {
    return "hf-status-badge-green";
  }

  if (normalized === "viewed") {
    return "hf-status-badge-blue";
  }

  if (normalized === "rejected") {
    return "hf-status-badge-gray";
  }

  return "hf-status-badge-amber";
}

function getApplicationStatus(job, statusMap = {}) {
  return statusMap[job?._id] || "Applied";
}

function getJobStatusPresentation(job) {
  if (job?.workflowState === "failed") {
    return {
      label: "Failed",
      className: "hf-chip hf-chip-dark",
      reason: job?.manualActionReason || "HireFlow could not complete this application automatically.",
    };
  }

  if (job?.manualApplyInProgress) {
    return {
      label: "In Progress",
      className: "hf-chip hf-chip-blue",
      reason: "You opened the external application and still need to finish it.",
    };
  }

  if (job?.manualActionRequired || job?.manualActionNeeded) {
    return {
      label: "Manual Action Needed",
      className: "hf-chip hf-chip-amber",
      reason: job?.manualActionReason || "This job still needs you to finish the application manually.",
    };
  }

  if (isReadyToApplyJob(job)) {
    return {
      label: "Ready",
      className: "hf-chip hf-chip-green",
      reason: "HireFlow has what it needs to apply from the dashboard.",
    };
  }

  if (job?.workflowState === "applied") {
    return {
      label: "Applied",
      className: "hf-chip hf-chip-green",
      reason: "HireFlow completed and recorded this application.",
    };
  }

  return {
    label: "Matched",
    className: "hf-chip hf-chip-dark",
    reason: "This match is waiting for review before you move it forward.",
  };
}

function sanitizeFilename(value = "file") {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function formatDate(value) {
  if (!value) {
    return "Recently";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function sortByFreshness(a, b) {
  return new Date(b?.appliedAt || b?.manualApplyStartedAt || b?.createdAt || 0).getTime()
    - new Date(a?.appliedAt || a?.manualApplyStartedAt || a?.createdAt || 0).getTime();
}

function formatRelativeTime(value) {
  if (!value) {
    return "Just now";
  }

  const target = new Date(value).getTime();

  if (!Number.isFinite(target)) {
    return "Just now";
  }

  const diffMs = target - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (Math.abs(diffMinutes) < 60) {
    return formatter.format(diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return formatter.format(diffHours, "hour");
  }

  const diffDays = Math.round(diffHours / 24);
  return formatter.format(diffDays, "day");
}

function formatCompensation(amount, currency = "INR") {
  const numeric = Number(amount || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return "";
  }

  if (String(currency || "").toUpperCase() === "INR") {
    return `₹${(numeric / 100000).toFixed(1)} LPA`;
  }

  return `${String(currency || "USD").toUpperCase()} ${Math.round(numeric).toLocaleString("en-US")}`;
}

function getOfferGapText(delta = 0, currency = "INR") {
  const numeric = Number(delta || 0);

  if (!numeric) {
    return "Offer is roughly at market";
  }

  if (numeric < 0) {
    return `This offer is ${formatCompensation(Math.abs(numeric), currency)} below market rate.`;
  }

  return `This offer is ${formatCompensation(numeric, currency)} above market rate.`;
}

function getNegotiationWinText(uplift = 0, currency = "INR") {
  const numeric = Number(uplift || 0);

  if (!numeric) {
    return "Waiting for final offer";
  }

  return `+${formatCompensation(numeric, currency)}`;
}

function getToneChipClass(tone = "dark") {
  if (tone === "green") return "hf-chip-green";
  if (tone === "blue") return "hf-chip-blue";
  if (tone === "amber") return "hf-chip-amber";
  return "hf-chip-dark";
}

function buildLiveActivityFeed({ applications = [], savedJobs = [], applicationStatuses = {} }) {
  const feed = [];
  const appliedJobReferenceSet = new Set(
    applications
      .flatMap((item) => [item?.job, item?.jobId])
      .map((value) => String(value || "").trim())
      .filter(Boolean)
  );

  for (const application of applications) {
    const appliedAt = application.appliedAt || application.createdAt || Date.now();
    const score10 = Number(application.matchScore || 0) > 10
      ? Number(application.matchScore || 0) / 10
      : Number(application.matchScore || 0);

    feed.push({
      id: `applied-app-${application._id}`,
      label: "Applied",
      tone: "hf-chip-green",
      title: `Applied to ${application.jobTitle || application.title || "a role"} at ${application.company || "a company"}`,
      body: `Match: ${score10 ? score10.toFixed(1) : "0.0"}/10`,
      timeAgo: formatRelativeTime(appliedAt),
      at: new Date(appliedAt).getTime(),
    });

    if (application.status === "failed") {
      feed.push({
        id: `failed-app-${application._id}`,
        label: "Failed",
        tone: "hf-chip-dark",
        title: `Application failed for ${application.jobTitle || application.title || "a role"}`,
        body: `${application.company || "A company"} needs another attempt or a manual follow-up.`,
        timeAgo: formatRelativeTime(application.updatedAt || appliedAt),
        at: new Date(application.updatedAt || appliedAt).getTime(),
      });
    }

    if (application.lifecycleStatus === "Interview") {
      feed.push({
        id: `interview-app-${application._id}`,
        label: "Interview",
        tone: "hf-chip-green",
        title: `${application.company || "A company"} moved you to interview`,
        body: `${application.jobTitle || application.title || "Role"} is now in your interview stage.`,
        timeAgo: formatRelativeTime(application.respondedAt || appliedAt),
        at: new Date(application.respondedAt || appliedAt).getTime(),
      });
    }

    if (application.lifecycleStatus === "Offer") {
      feed.push({
        id: `offer-app-${application._id}`,
        label: "Offer",
        tone: "hf-chip-green",
        title: `${application.company || "A company"} extended an offer`,
        body: `${application.jobTitle || application.title || "Role"} reached offer stage.`,
        timeAgo: formatRelativeTime(application.respondedAt || appliedAt),
        at: new Date(application.respondedAt || appliedAt).getTime(),
      });
    }
  }

  for (const job of savedJobs) {
    const jobReferences = [job?._id, job?.jobId].map((value) => String(value || "").trim()).filter(Boolean);
    const isAppliedFromApplications = jobReferences.some((candidate) => appliedJobReferenceSet.has(candidate));

    if (!isAppliedFromApplications && Number(job.aiScore10 || 0) >= 9.5) {
      feed.push({
        id: `perfect-${job._id}`,
        label: "Perfect Match",
        tone: "hf-chip-blue",
        title: `New ${(Number(job.aiScore10 || 0)).toFixed(1)}/10 match at ${job.company || "a company"}`,
        body: "New match found — tap to review",
        timeAgo: formatRelativeTime(job.createdAt),
        at: new Date(job.createdAt || Date.now()).getTime(),
      });
    }

    if (job?.manualActionRequired || job?.manualActionNeeded) {
      feed.push({
        id: `manual-${job._id}`,
        label: "Manual",
        tone: "hf-chip-amber",
        title: `${job.company || "A company"} still needs your action`,
        body: job.manualActionReason || "Finish the external application to move this job forward.",
        timeAgo: formatRelativeTime(job.updatedAt || job.createdAt),
        at: new Date(job.updatedAt || job.createdAt || Date.now()).getTime(),
      });
    }

    const status = getApplicationStatus(job, applicationStatuses);
    if (status === "Interview") {
      feed.push({
        id: `interview-${job._id}`,
        label: "Interview",
        tone: "hf-chip-green",
        title: `${job.company || "A company"} moved you to interview`,
        body: `${job.title || "Role"} is now in your interview stage.`,
        timeAgo: formatRelativeTime(job.updatedAt || job.createdAt),
        at: new Date(job.updatedAt || job.createdAt || Date.now()).getTime(),
      });
    }
  }

  return feed.sort((a, b) => b.at - a.at).slice(0, 8);
}

function CareerInterviewModal({
  answers,
  step,
  onStepChange,
  onAnswerChange,
  onClose,
  onSubmit,
  loading,
  error,
  progress,
  completed,
}) {
  const currentQuestion = CAREER_INTERVIEW_QUESTIONS[step];
  const isLastStep = step === CAREER_INTERVIEW_QUESTIONS.length - 1;
  const currentValue = answers?.[currentQuestion?.key] || "";

  return (
    <div className="hf-modal-backdrop">
      <div className="hf-modal-card">
        <div className="hf-panel-header">
          <h3>Career DNA Interview</h3>
          <p>
            A one-time deep dive that helps HireFlow understand what drives you, what you want next, and how hard to push.
          </p>
        </div>

        <div className="hf-career-progress">
          <div className="hf-career-progress-bar">
            <div className="hf-career-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span>About 10 minutes • Step {step + 1} of {CAREER_INTERVIEW_QUESTIONS.length}</span>
        </div>

        <div className="hf-career-question">
          <span className="hf-chip hf-chip-blue">Career Signal {step + 1}</span>
          <h4>{currentQuestion.label}</h4>
          <textarea
            className="hf-textarea hf-career-textarea"
            value={currentValue}
            onChange={(event) => onAnswerChange(currentQuestion.key, event.target.value)}
            placeholder={currentQuestion.placeholder}
          />
        </div>

        <div className="hf-career-step-list">
          {CAREER_INTERVIEW_QUESTIONS.map((item, index) => (
            <button
              key={item.key}
              className={index === step ? "hf-career-step-pill active" : "hf-career-step-pill"}
              onClick={() => onStepChange(index)}
            >
              {index + 1}
            </button>
          ))}
        </div>

        {error ? <p className="hf-error">{error}</p> : null}

        <div className="hf-panel-actions">
          {completed ? (
            <button className="hf-btn hf-btn-ghost" onClick={onClose}>
              Close
            </button>
          ) : null}

          {step > 0 ? (
            <button className="hf-btn hf-btn-ghost" onClick={() => onStepChange(step - 1)}>
              Back
            </button>
          ) : null}

          {!isLastStep ? (
            <button className="hf-btn hf-btn-primary" onClick={() => onStepChange(step + 1)}>
              Next Question
            </button>
          ) : (
            <button className="hf-btn hf-btn-primary" onClick={onSubmit} disabled={loading}>
              {loading ? "Building Career DNA..." : "Build Career DNA"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function AuthScreen({
  authMode,
  authLoading,
  authMessage,
  loginEmail,
  loginPassword,
  registerName,
  registerEmail,
  registerPassword,
  registerReferralCode,
  onAuthModeChange,
  onLoginEmailChange,
  onLoginPasswordChange,
  onRegisterNameChange,
  onRegisterEmailChange,
  onRegisterPasswordChange,
  onLogin,
  onRegister,
}) {
  const [applicationCounter, setApplicationCounter] = useState(1247);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setApplicationCounter((prev) => prev + Math.floor(Math.random() * 3));
    }, 2200);

    return () => window.clearInterval(timer);
  }, []);

  function jumpToRegister() {
    onAuthModeChange("register");
    window.requestAnimationFrame(() => {
      const target = document.getElementById("hf-auth-form");
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  return (
    <div className="hf-auth-shell">
      <div className="hf-auth-layout">
        <section className="hf-landing-hero">
          <div className="hf-landing-copy">
            <p className="hf-brand-eyebrow">HireFlow AI</p>
            <h1>Stop Applying. Start Getting Hired.</h1>
            <p className="hf-landing-subheadline">
              HireFlow AI tailors your resume, writes your cover letter, and applies to jobs automatically while you sleep.
            </p>
            <div className="hf-landing-actions">
              <button className="hf-btn hf-btn-primary hf-btn-hero" onClick={jumpToRegister}>
                Get Started Free
              </button>
            </div>
            <div className="hf-counter-card">
              <strong>{new Intl.NumberFormat("en-US").format(applicationCounter)}</strong>
              <span>applications sent today</span>
            </div>
          </div>

          <div className="hf-landing-side">
            <div className="hf-landing-proof-card">
              <span className="hf-chip hf-chip-green">Always-on job automation</span>
              <h3>Wake up to more applications already moving.</h3>
              <p>
                HireFlow AI keeps your search active with tailored resumes, stronger cover letters, and a workflow built to create momentum.
              </p>
            </div>
          </div>
        </section>

        <section className="hf-landing-section">
          <div className="hf-panel-header">
            <h3>Social Proof</h3>
            <p>Job seekers use HireFlow AI to build consistency and get into more interview pipelines faster.</p>
          </div>
          <div className="hf-testimonial-grid">
            {LANDING_TESTIMONIALS.map((item) => (
              <div className="hf-testimonial-card" key={item.name}>
                <div className="hf-testimonial-head">
                  <div className="hf-testimonial-photo">{item.photo}</div>
                  <div>
                    <strong>{item.name}</strong>
                    <span>{item.result}</span>
                  </div>
                </div>
                <p>{item.quote}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="hf-landing-section">
          <div className="hf-panel-header">
            <h3>How It Works</h3>
            <p>Set your profile once, then let the workflow keep moving for you.</p>
          </div>
          <div className="hf-how-grid">
            {LANDING_STEPS.map((item) => (
              <div className="hf-how-card" key={item.title}>
                <div className="hf-how-icon">{item.icon}</div>
                <strong>{item.title}</strong>
                <p>{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="hf-landing-section">
          <div className="hf-panel-header">
            <h3>Pricing</h3>
            <p>Start free, then scale up when you want more automated reach.</p>
          </div>
          <div className="hf-pricing-grid">
            {LANDING_PRICING.map((item) => (
              <div className={item.featured ? "hf-pricing-card featured" : "hf-pricing-card"} key={item.tier}>
                <span className="hf-chip hf-chip-dark">{item.tier}</span>
                <strong>{item.price}</strong>
                <p>{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="hf-landing-section hf-trust-section">
          <div className="hf-trust-chip-row">
            {LANDING_TRUST.map((item) => (
              <span className="hf-chip hf-chip-dark" key={item}>
                {item}
              </span>
            ))}
          </div>
        </section>

        <div className="hf-auth-card" id="hf-auth-form">
          <div className="hf-auth-brand">
            <div className="hf-brand-mark">H</div>
            <div>
              <h1>HireFlow AI</h1>
              <p>Create your account and start applying smarter.</p>
            </div>
          </div>

          <div className="hf-auth-copy">
            <p className="hf-kicker">Get Started Free</p>
            <h2>Build your job search engine in minutes.</h2>
            <p>
              Sign up to tailor resumes, generate better cover letters, and automate the repetitive parts of the job hunt.
            </p>
          </div>

          {registerReferralCode ? (
            <div className="hf-referral-banner">
              <span className="hf-chip hf-chip-green">Referral bonus active</span>
              <p>
                Sign up with code <strong>{registerReferralCode}</strong> to unlock 2 weeks free after account creation.
              </p>
            </div>
          ) : null}

          <div className="hf-auth-tabs">
            <button
              className={authMode === "login" ? "hf-tab active" : "hf-tab"}
              onClick={() => onAuthModeChange("login")}
            >
              Login
            </button>
            <button
              className={authMode === "register" ? "hf-tab active" : "hf-tab"}
              onClick={() => onAuthModeChange("register")}
            >
              Register
            </button>
          </div>

          {authMessage ? <p className="hf-error">{authMessage}</p> : null}

          {authMode === "login" ? (
            <div className="hf-auth-form">
              <div className="hf-field-block">
                <label className="hf-label">Email</label>
                <input
                  className="hf-input"
                  type="email"
                  value={loginEmail}
                  onChange={(e) => onLoginEmailChange(e.target.value)}
                  placeholder="Enter your email"
                />
              </div>

              <div className="hf-field-block">
                <label className="hf-label">Password</label>
                <input
                  className="hf-input"
                  type="password"
                  value={loginPassword}
                  onChange={(e) => onLoginPasswordChange(e.target.value)}
                  placeholder="Enter your password"
                />
              </div>

              <button className="hf-btn hf-btn-primary hf-full-btn" onClick={onLogin} disabled={authLoading}>
                {authLoading ? "Logging in..." : "Login"}
              </button>
            </div>
          ) : (
            <div className="hf-auth-form">
              <div className="hf-field-block">
                <label className="hf-label">Name</label>
                <input
                  className="hf-input"
                  type="text"
                  value={registerName}
                  onChange={(e) => onRegisterNameChange(e.target.value)}
                  placeholder="Enter your name"
                />
              </div>

              <div className="hf-field-block">
                <label className="hf-label">Email</label>
                <input
                  className="hf-input"
                  type="email"
                  value={registerEmail}
                  onChange={(e) => onRegisterEmailChange(e.target.value)}
                  placeholder="Enter your email"
                />
              </div>

              <div className="hf-field-block">
                <label className="hf-label">Password</label>
                <input
                  className="hf-input"
                  type="password"
                  value={registerPassword}
                  onChange={(e) => onRegisterPasswordChange(e.target.value)}
                  placeholder="Create a password"
                />
              </div>

              {registerReferralCode ? (
                <div className="hf-field-block">
                  <label className="hf-label">Referral Code</label>
                  <input className="hf-input" type="text" value={registerReferralCode} readOnly />
                </div>
              ) : null}

              <button className="hf-btn hf-btn-primary hf-full-btn" onClick={onRegister} disabled={authLoading}>
                {authLoading ? "Creating account..." : "Get Started Free"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
