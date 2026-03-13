import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  AlertCircle,
  Factory,
  Package,
  TimerReset,
  UserCheck
} from 'lucide-react';
import dbConnect from '@/lib/db';
import ProductionStage from '@/models/ProductionStage';
import SRD from '@/models/SRD';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const DEPARTMENTS = [
  { key: 'vmd', label: 'VMD' },
  { key: 'cad', label: 'CAD' },
  { key: 'commercial', label: 'Commercial' },
  { key: 'mmc', label: 'MMC' },
];

function toDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function compareDatesDesc(a, b) {
  const left = toDate(a)?.getTime() || 0;
  const right = toDate(b)?.getTime() || 0;
  return right - left;
}

function formatDateTime(value) {
  const date = toDate(value);
  if (!date) return 'N/A';

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatDuration(ms) {
  if (!ms || ms < 0) return 'N/A';

  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;

  return 'Under 1m';
}

function getAuditTimestamp(entry) {
  return toDate(entry?.timestamp || entry?.date);
}

function getStatusStyles(status) {
  switch (status) {
    case 'approved':
      return {
        card: 'border-emerald-200 bg-emerald-50/80',
        badge: 'border-emerald-200 bg-emerald-100 text-emerald-700',
        dot: 'bg-emerald-500',
        accent: 'text-emerald-700',
      };
    case 'flagged':
      return {
        card: 'border-rose-200 bg-rose-50/80',
        badge: 'border-rose-200 bg-rose-100 text-rose-700',
        dot: 'bg-rose-500',
        accent: 'text-rose-700',
      };
    case 'in-progress':
      return {
        card: 'border-sky-200 bg-sky-50/80',
        badge: 'border-sky-200 bg-sky-100 text-sky-700',
        dot: 'bg-sky-500',
        accent: 'text-sky-700',
      };
    default:
      return {
        card: 'border-slate-200 bg-white',
        badge: 'border-slate-200 bg-slate-100 text-slate-700',
        dot: 'bg-slate-300',
        accent: 'text-slate-700',
      };
  }
}

function getProductionStageStyles(status) {
  switch (status) {
    case 'completed':
      return {
        card: 'border-emerald-200 bg-emerald-50/80',
        badge: 'border-emerald-200 bg-emerald-100 text-emerald-700',
        dot: 'bg-emerald-500',
        accent: 'text-emerald-700',
      };
    case 'in-progress':
      return {
        card: 'border-sky-200 bg-sky-50/80',
        badge: 'border-sky-200 bg-sky-100 text-sky-700',
        dot: 'bg-sky-500',
        accent: 'text-sky-700',
      };
    case 'on-hold':
      return {
        card: 'border-amber-200 bg-amber-50/80',
        badge: 'border-amber-200 bg-amber-100 text-amber-700',
        dot: 'bg-amber-500',
        accent: 'text-amber-700',
      };
    case 'issue':
      return {
        card: 'border-rose-200 bg-rose-50/80',
        badge: 'border-rose-200 bg-rose-100 text-rose-700',
        dot: 'bg-rose-500',
        accent: 'text-rose-700',
      };
    default:
      return {
        card: 'border-slate-200 bg-white',
        badge: 'border-slate-200 bg-slate-100 text-slate-700',
        dot: 'bg-slate-300',
        accent: 'text-slate-700',
      };
  }
}

function buildDepartmentSummaries(srd) {
  const createdAt = toDate(srd.createdAt);
  const audit = Array.isArray(srd.audit) ? [...srd.audit] : [];
  const now = new Date();

  return DEPARTMENTS.map((department) => {
    const status = srd.status?.[department.key] || 'pending';

    const approvalEntry = audit
      .filter((entry) =>
        entry?.action?.toLowerCase().includes(`approved by ${department.key}`)
      )
      .sort((a, b) => compareDatesDesc(a?.timestamp || a?.date, b?.timestamp || b?.date))[0] || null;

    const flaggedEntry = audit
      .filter((entry) =>
        entry?.action?.toLowerCase().includes(`flagged issue in ${department.key}`)
      )
      .sort((a, b) => compareDatesDesc(a?.timestamp || a?.date, b?.timestamp || b?.date))[0] || null;

    const progressEntry = audit
      .filter((entry) =>
        entry?.action?.toLowerCase().includes(`updated to in progress by ${department.key}`)
      )
      .sort((a, b) => compareDatesDesc(a?.timestamp || a?.date, b?.timestamp || b?.date))[0] || null;

    const approvedAt = getAuditTimestamp(approvalEntry);
    const flaggedAt = getAuditTimestamp(flaggedEntry);
    const inProgressAt = getAuditTimestamp(progressEntry);

    let duration = createdAt ? now - createdAt : null;
    let timeLabel = 'Time elapsed';
    let helper = 'Still waiting for approval';

    if (status === 'approved') {
      duration = createdAt && approvedAt ? approvedAt - createdAt : null;
      timeLabel = 'Time to approve';
      helper = approvedAt ? `Approved on ${formatDateTime(approvedAt)}` : 'Approved';
    } else if (status === 'flagged') {
      duration = createdAt && flaggedAt ? flaggedAt - createdAt : null;
      timeLabel = 'Time to flag';
      helper = flaggedAt ? `Flagged on ${formatDateTime(flaggedAt)}` : 'Flagged';
    } else if (status === 'in-progress') {
      duration = createdAt ? now - createdAt : null;
      timeLabel = 'Time in progress';
      helper = inProgressAt
        ? `In progress since ${formatDateTime(inProgressAt)}`
        : 'Currently in progress';
    }

    return {
      ...department,
      status,
      approvedAt,
      flaggedAt,
      inProgressAt,
      duration,
      timeLabel,
      helper,
      styles: getStatusStyles(status),
    };
  });
}

function buildProductionSummary(srd) {
  const history = Array.isArray(srd.productionHistory) ? [...srd.productionHistory] : [];
  const currentStageId =
    srd.currentProductionStage && typeof srd.currentProductionStage === 'object'
      ? String(srd.currentProductionStage._id || srd.currentProductionStage.id || '')
      : String(srd.currentProductionStage || '');
  const currentEntry =
    [...history].reverse().find((entry) => {
      const entryStageId =
        entry?.stage && typeof entry.stage === 'object'
          ? String(entry.stage._id || entry.stage.id || '')
          : String(entry?.stage || '');

      return currentStageId && entryStageId === currentStageId;
    }) ||
    [...history].reverse().find((entry) => entry.status === 'in-progress') ||
    history[history.length - 1] ||
    null;
  const productionStart = toDate(srd.productionStartDate || currentEntry?.startDate);
  const productionEnd = toDate(srd.productionEndDate);
  const currentStageStart = toDate(currentEntry?.startDate);
  const currentStageEnd = toDate(currentEntry?.endDate);
  const now = new Date();
  
  if (srd.isComplete) {
    return {
      state: 'completed',
      label: 'Production completed',
      helper: `Completed on ${formatDateTime(productionEnd)}`,
      totalDuration: productionStart ? productionEnd - productionStart : null,
      stageDuration: null,
      badge: 'border-emerald-200 bg-emerald-100 text-emerald-700',
      card: 'border-emerald-200 bg-emerald-50/80',
    };
  }

  const currentStageLabel =
    (srd.currentProductionStage &&
      typeof srd.currentProductionStage === 'object' &&
      (srd.currentProductionStage.displayName || srd.currentProductionStage.name)) ||
    currentEntry?.stageDisplayName ||
    currentEntry?.stageName ||
    'In production';

  if (srd.inProduction) {
    return {
      state: 'in-production',
      label: currentStageLabel,
      helper: currentStageStart ? `Stage started ${formatDateTime(currentStageStart)}` : 'Production is active',
      totalDuration: productionStart ? now - productionStart : null,
      stageDuration: currentStageStart ? now - currentStageStart : null,
      badge: 'border-sky-200 bg-sky-100 text-sky-700',
      card: 'border-sky-200 bg-sky-50/80',
    };
  }

  if (srd.readyForProduction) {
    return {
      state: 'ready',
      label: 'Ready for production',
      helper: 'Approved by all departments, waiting to start',
      totalDuration: null,
      stageDuration: null,
      badge: 'border-amber-200 bg-amber-100 text-amber-700',
      card: 'border-amber-200 bg-amber-50/80',
    };
  }

  return {
    state: 'idle',
    label: 'Not in production',
    helper: 'Production has not started',
    totalDuration: null,
    stageDuration: null,
    badge: 'border-slate-200 bg-slate-100 text-slate-700',
    card: 'border-slate-200 bg-white',
  };
}

function buildCustomerApprovalSummary(srd) {
  const approval = srd.customerApproval;
  
  if (!approval || approval.status === 'pending') {
    return {
      label: 'Pending Approval',
      helper: 'Waiting for customer review',
      badge: 'border-orange-200 bg-orange-100 text-orange-800',
      card: 'border-orange-200 bg-orange-50/80',
      icon: TimerReset
    };
  }
  
  if (approval.status === 'approved') {
    return {
      label: 'Customer Approved',
      helper: `Approved by ${approval.by} on ${formatDateTime(approval.date)}${approval.comments ? ` - "${approval.comments}"` : ''}`,
      badge: 'border-emerald-200 bg-emerald-100 text-emerald-700',
      card: 'border-emerald-200 bg-emerald-50/80',
      icon: CheckCircle2
    };
  }

  if (approval.status === 'rejected') {
    return {
      label: 'Customer Rejected',
      helper: `Rejected by ${approval.by} on ${formatDateTime(approval.date)}${approval.comments ? ` - "${approval.comments}"` : ''}`,
      badge: 'border-rose-200 bg-rose-100 text-rose-700',
      card: 'border-rose-200 bg-rose-50/80',
      icon: AlertCircle
    };
  }
}

function buildProductionStageSummaries(stages, srd) {
  const history = Array.isArray(srd.productionHistory) ? srd.productionHistory : [];
  const now = new Date();

  return stages.map((stage) => {
    const historyEntry = [...history].reverse().find((entry) => {
      const entryStageId =
        entry?.stage && typeof entry.stage === 'object'
          ? String(entry.stage._id || entry.stage.id || '')
          : String(entry?.stage || '');

      return entryStageId === String(stage._id);
    }) || null;

    const status = historyEntry?.status || 'pending';
    const startDate = toDate(historyEntry?.startDate);
    const endDate = toDate(historyEntry?.endDate);
    const effectiveEnd = status === 'completed' ? endDate : startDate ? now : null;
    const duration = startDate && effectiveEnd ? effectiveEnd - startDate : null;

    let helper = 'Waiting to enter this stage';
    if (status === 'completed') {
      helper = endDate ? `Completed on ${formatDateTime(endDate)}` : 'Completed';
    } else if (status === 'in-progress') {
      helper = startDate ? `Started on ${formatDateTime(startDate)}` : 'Currently in progress';
    } else if (status === 'on-hold') {
      helper = startDate ? `On hold since ${formatDateTime(startDate)}` : 'Currently on hold';
    } else if (status === 'issue') {
      helper = startDate ? `Issue reported after ${formatDateTime(startDate)}` : 'Issue reported';
    }

    return {
      id: String(stage._id),
      label: stage.displayName || stage.name,
      status,
      duration,
      helper,
      styles: getProductionStageStyles(status),
    };
  });
}

function SummaryCard({ title, value, description, icon: Icon, className = '' }) {
  return (
    <Card className={cn('border-slate-200 shadow-sm', className)}>
      <CardHeader className="pb-3">
        <CardDescription className="flex items-center gap-2 text-slate-500">
          <Icon className="h-4 w-4" />
          {title}
        </CardDescription>
        <CardTitle className="text-lg text-slate-950 sm:text-xl">{value}</CardTitle>
        {description ? <p className="text-sm text-slate-600">{description}</p> : null}
      </CardHeader>
    </Card>
  );
}

export default async function SRDDetailsPage({ params }) {
  const resolvedParams = await params;

  await dbConnect();
  const srd = await SRD.findById(resolvedParams.id)
    .populate('currentProductionStage')
    .populate('productionHistory.stage')
    .lean();
  const productionStages = await ProductionStage.find({ isActive: true }).sort({ order: 1 }).lean();

  if (!srd) {
    notFound();
  }

  const srdId = String(srd._id);
  const createdAt = toDate(srd.createdAt);
  const departmentSummaries = buildDepartmentSummaries(srd);
  const productionSummary = buildProductionSummary(srd);
  const customerApprovalSummary = srd.isComplete ? buildCustomerApprovalSummary(srd) : null;
  const productionStageSummaries = buildProductionStageSummaries(productionStages, srd);
  const approvedCount = departmentSummaries.filter((item) => item.status === 'approved').length;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef4ff_50%,#f8fafc_100%)]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-5 px-3 py-4 sm:gap-6 sm:px-6 sm:py-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <Button asChild variant="outline" className="w-full justify-start rounded-full sm:w-auto">
            <Link href={`/srd/${srdId}`}>
              <ArrowLeft className="h-4 w-4" />
              Back to SRD workspace
            </Link>
          </Button>

          <Badge className="w-fit border border-slate-200 bg-white px-3 py-1 text-slate-700">
            {srd.refNo}
          </Badge>
        </div>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="space-y-4 p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <CardTitle className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                  {srd.title || 'Sample Request Summary'}
                </CardTitle>
                <CardDescription className="max-w-3xl text-sm leading-6 text-slate-600">
                  {srd.description || 'No description was added when this SRD was created.'}
                </CardDescription>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm shadow-inner">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Created By
                </p>
                <p className="mt-1 font-medium text-slate-900">
                  {srd.createdBy?.name || 'Unknown'}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Created at {formatDateTime(createdAt)}
                </p>
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                title="Created"
                value={formatDateTime(createdAt)}
                description="SRD raise time"
                icon={CalendarClock}
              />
              <SummaryCard
                title="Approved Departments"
                value={`${approvedCount}/${DEPARTMENTS.length}`}
                description="Departments that have approved"
                icon={CheckCircle2}
                className="border-emerald-200 bg-emerald-50/80"
              />
              <SummaryCard
                title="Production Pipeline"
                value={productionSummary.label}
                description={productionSummary.helper}
                icon={Factory}
                className={productionSummary.card}
              />
              <SummaryCard
                title="Production Time"
                value={formatDuration(productionSummary.totalDuration)}
                description={
                  productionSummary.stageDuration
                    ? `Current stage time: ${formatDuration(productionSummary.stageDuration)}`
                    : 'No production time recorded yet'
                }
                icon={TimerReset}
              />
              {srd.isComplete && customerApprovalSummary && (
                <SummaryCard
                  title="Customer Review"
                  value={customerApprovalSummary.label}
                  description={customerApprovalSummary.helper}
                  icon={customerApprovalSummary.icon}
                  className={customerApprovalSummary.card}
                />
              )}
            </div>
          </CardHeader>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="space-y-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-xl text-slate-950">Department Status Pipeline</CardTitle>
                <CardDescription>
                  Approval status and total time each department took from SRD creation.
                </CardDescription>
              </div>
              <Badge className={cn('w-fit border', productionSummary.badge)}>
                {productionSummary.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <div className="absolute left-8 right-8 top-6 hidden h-px bg-slate-200 xl:block" />
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {departmentSummaries.map((department) => (
                  <div
                    key={department.key}
                    className={cn('relative rounded-3xl border p-5 shadow-sm transition', department.styles.card)}
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={cn('h-3.5 w-3.5 rounded-full', department.styles.dot)} />
                        <p className="text-lg font-semibold text-slate-950">{department.label}</p>
                      </div>
                      <Badge className={cn('border', department.styles.badge)}>
                        {department.status.replace('-', ' ')}
                      </Badge>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Status Time
                        </p>
                        <p className={cn('mt-2 text-2xl font-bold', department.styles.accent)}>
                          {formatDuration(department.duration)}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">{department.timeLabel}</p>
                      </div>

                      <div className="rounded-2xl bg-white/80 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Milestone
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-700">
                          {department.helper}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="space-y-2">
            <CardTitle className="text-xl text-slate-950">Production Snapshot</CardTitle>
            <CardDescription>
              Current production stage and how long production has taken so far.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 lg:grid-cols-3">
              <div className={cn('rounded-3xl border p-5 shadow-sm', productionSummary.card)}>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm">
                    <Package className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Current Pipeline
                    </p>
                    <p className="mt-1 text-lg font-semibold text-slate-950">
                      {productionSummary.label}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Production Duration
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-950">
                  {formatDuration(productionSummary.totalDuration)}
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Total time in the production pipeline
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Current Stage Time
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-950">
                  {formatDuration(productionSummary.stageDuration)}
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {productionSummary.helper}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="space-y-2">
            <CardTitle className="text-xl text-slate-950">Production Stage Pipeline</CardTitle>
            <CardDescription>
              Time taken in each production stage for this SRD.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {productionStageSummaries.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                No production stages are configured.
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-8 right-8 top-6 hidden h-px bg-slate-200 xl:block" />
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {productionStageSummaries.map((stage) => (
                    <div
                      key={stage.id}
                      className={cn('relative rounded-3xl border p-5 shadow-sm transition', stage.styles.card)}
                    >
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={cn('h-3.5 w-3.5 rounded-full', stage.styles.dot)} />
                          <p className="text-lg font-semibold text-slate-950">{stage.label}</p>
                        </div>
                        <Badge className={cn('border', stage.styles.badge)}>
                          {stage.status.replace('-', ' ')}
                        </Badge>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Stage Time
                          </p>
                          <p className={cn('mt-2 text-2xl font-bold', stage.styles.accent)}>
                            {formatDuration(stage.duration)}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-white/80 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Stage Status
                          </p>
                          <p className="mt-2 text-sm leading-6 text-slate-700">
                            {stage.helper}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
