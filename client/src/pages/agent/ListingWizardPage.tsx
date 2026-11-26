import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Circle,
  Clock,
  Eye,
  Save,
  Send,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";

import { ImageUploader } from "@/components/agent/ImageUploader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiClientError, api } from "@/lib/api";
import { formatArea, formatPrice, formatRent } from "@/lib/format";
import { propertyKeys, usePropertyForEdit } from "@/lib/queries/properties";
import {
  stepFields,
  wizardSchema,
  wizardSteps,
  type WizardValues,
} from "@/lib/validation/listing-wizard";
import { cn } from "@/lib/utils";
import {
  amenityOptions,
  cityCoordinates,
  citySuggestions,
  propertyTypeLabels,
  rejectionCategoryLabels,
  statusLabels,
  statusTones,
  type ListingType,
  type PropertyDetail,
  type PropertyImage,
  type PropertyStatus,
  type PropertyType,
  type RentPeriod,
} from "@/types/property";

const defaults: WizardValues = {
  title: "",
  listingType: "sale",
  propertyType: "house",
  description: "",
  street: "",
  city: "",
  state: "",
  zip: "",
  country: "United States",
  neighborhood: "",
  latitude: "",
  longitude: "",
  beds: "0",
  baths: "0",
  garages: "0",
  sizeSqft: "",
  lotSizeSqft: "",
  yearBuilt: "",
  amenities: [],
  price: "",
  rentPeriod: "monthly",
};

function toFormValues(property: PropertyDetail): WizardValues {
  return {
    title: property.title,
    listingType: property.listingType,
    propertyType: property.propertyType,
    description: property.description,
    street: property.address.street ?? "",
    city: property.address.city ?? "",
    state: property.address.state ?? "",
    zip: property.address.zip ?? "",
    country: property.address.country ?? "United States",
    neighborhood: property.address.neighborhood ?? "",
    latitude: property.location ? String(property.location.lat) : "",
    longitude: property.location ? String(property.location.lng) : "",
    beds: String(property.beds),
    baths: String(property.baths),
    garages: String(property.garages),
    sizeSqft: property.sizeSqft ? String(property.sizeSqft) : "",
    lotSizeSqft: property.lotSizeSqft ? String(property.lotSizeSqft) : "",
    yearBuilt: property.yearBuilt ? String(property.yearBuilt) : "",
    amenities: property.amenities,
    price: property.price ? String(property.price) : "",
    rentPeriod: property.rentPeriod ?? "monthly",
  };
}

function toPayload(values: WizardValues, images: PropertyImage[]) {
  const numeric = (value: string) => (value.trim() === "" ? null : Number(value));

  return {
    title: values.title.trim(),
    description: values.description.trim(),
    listingType: values.listingType,
    propertyType: values.propertyType as PropertyType,
    price: numeric(values.price) ?? 0,
    rentPeriod: values.listingType === "rent" ? (values.rentPeriod as RentPeriod) : null,
    beds: numeric(values.beds) ?? 0,
    baths: numeric(values.baths) ?? 0,
    garages: numeric(values.garages) ?? 0,
    sizeSqft: numeric(values.sizeSqft) ?? 0,
    lotSizeSqft: numeric(values.lotSizeSqft),
    yearBuilt: numeric(values.yearBuilt),
    address: {
      street: values.street.trim(),
      city: values.city.trim(),
      state: values.state.trim(),
      zip: values.zip.trim(),
      country: values.country.trim() || "United States",
      neighborhood: (values.neighborhood ?? "").trim() || undefined,
    },
    location:
      values.latitude.trim() && values.longitude.trim()
        ? { lat: Number(values.latitude), lng: Number(values.longitude) }
        : null,
    amenities: values.amenities,
    images,
  };
}

function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-heading">
        {label}
        {required ? (
          <span className="ml-0.5 text-danger" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

function StatusPanel({ property }: { property: PropertyDetail }) {
  const steps = [
    {
      label: "Submitted",
      description: property.submittedAt
        ? new Date(property.submittedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
        : "Not submitted yet",
      done: Boolean(property.submittedAt),
      current: false,
    },
    {
      label: "Under review",
      description:
        property.status === "pending"
          ? "An administrator is reviewing the details."
          : property.reviewedAt
            ? "Review completed."
            : "Waiting for review.",
      done: Boolean(property.reviewedAt) || property.status === "pending",
      current: property.status === "pending",
    },
    {
      label: "Decision",
      description:
        property.status === "approved"
          ? "Approved and published."
          : property.status === "changes_requested"
            ? "Changes requested before publishing."
            : property.status === "rejected"
              ? "Rejected. Update and resubmit when ready."
              : "Waiting for a decision.",
      done: ["approved", "changes_requested", "rejected"].includes(property.status),
      current: ["changes_requested", "rejected"].includes(property.status),
    },
  ];

  return (
    <section className="rounded-lg border border-line bg-surface p-5" aria-labelledby="status-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="status-heading" className="text-lg font-semibold text-heading">
          Review status
        </h2>
        <Badge variant={statusTones[property.status]}>{statusLabels[property.status]}</Badge>
      </div>

      <ol className="mt-4 grid gap-3 sm:grid-cols-3">
        {steps.map((step) => (
          <li key={step.label} className="rounded-md border border-line bg-canvas p-3">
            <p className="flex items-center gap-1.5 text-sm font-medium text-heading">
              {step.done ? (
                <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
              ) : step.current ? (
                <Clock className="h-4 w-4 text-warning-text" aria-hidden="true" />
              ) : (
                <Circle className="h-4 w-4 text-muted" aria-hidden="true" />
              )}
              {step.label}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-body">{step.description}</p>
          </li>
        ))}
      </ol>

      {property.rejectionReason ? (
        <div className="mt-4 rounded-md border border-warning/40 bg-warning-tint px-3.5 py-3 text-sm text-warning-text">
          <p className="font-semibold">
            {rejectionCategoryLabels[property.rejectionReason.category] ?? "Admin note"}
          </p>
          <p className="mt-1 leading-relaxed">
            {property.rejectionReason.note ?? "No additional note was provided."}
          </p>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link to={`/properties/${property.slug}`}>
            <Eye className="h-4 w-4" aria-hidden="true" />
            Preview listing
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link to="/agent/listings">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to my listings
          </Link>
        </Button>
      </div>
    </section>
  );
}

export function ListingWizardPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNewRoute = !id;

  const {
    data: existing,
    isPending: loadingExisting,
    error: loadError,
  } = usePropertyForEdit(isNewRoute ? undefined : id);

  const [propertyId, setPropertyId] = useState<string | undefined>(isNewRoute ? undefined : id);
  const [status, setStatus] = useState<PropertyStatus>("draft");
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(isNewRoute ? 0 : 5);
  const [images, setImages] = useState<PropertyImage[]>([]);
  const [hydratedId, setHydratedId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [submitIssues, setSubmitIssues] = useState<Array<{ path: string; message: string }>>([]);
  const [loadedProperty, setLoadedProperty] = useState<PropertyDetail | null>(null);
  const initialImages = useRef("[]");

  const form = useForm<WizardValues>({
    resolver: zodResolver(wizardSchema) as Resolver<WizardValues>,
    defaultValues: defaults,
    mode: "onBlur",
  });

  const values = form.watch();
  const readOnly = status === "pending" || status === "archived";

  useEffect(() => {
    if (!existing || hydratedId === existing.id) return;

    form.reset(toFormValues(existing));
    setImages(existing.images);
    initialImages.current = JSON.stringify(existing.images);
    setStatus(existing.status);
    setLoadedProperty(existing);
    setHydratedId(existing.id);
    setPropertyId(existing.id);
  }, [existing, hydratedId, form]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  useEffect(() => {
    const city = values.city.trim().toLowerCase();
    const coords = cityCoordinates[city];
    if (!coords) return;
    if (!form.getValues("latitude") && !form.getValues("longitude")) {
      form.setValue("latitude", String(coords.lat));
      form.setValue("longitude", String(coords.lng));
    }
  }, [values.city, form]);

  function imagesDirty() {
    return JSON.stringify(images) !== initialImages.current;
  }

  async function persist({ silent = false }: { silent?: boolean } = {}) {
    if (readOnly) return null;

    const current = form.getValues();

    if (!propertyId) {
      const basicsValid = await form.trigger(stepFields[0]);
      if (!basicsValid) {
        if (!silent) toast.error("Complete the basics before saving a draft");
        return null;
      }
    }

    setSaveState("saving");

    try {
      const payload = toPayload(current, images);
      const detail = propertyId
        ? await api.patch<PropertyDetail>(`/properties/${propertyId}`, payload)
        : await api.post<PropertyDetail>("/properties", payload);

      if (!propertyId) {
        setPropertyId(detail.id);
        setHydratedId(detail.id);
        setStatus(detail.status);
        navigate(`/agent/listings/${detail.id}/edit`, { replace: true });
      }

      setStatus(detail.status);
      setLoadedProperty(detail);
      setSaveState("saved");
      setLastSavedAt(new Date());
      initialImages.current = JSON.stringify(images);
      form.reset(form.getValues(), { keepValues: true });
      void queryClient.invalidateQueries({ queryKey: propertyKeys.mine });
      void queryClient.invalidateQueries({ queryKey: propertyKeys.edit(detail.id) });
      return detail;
    } catch (error) {
      setSaveState("error");
      if (!silent) {
        toast.error(error instanceof ApiClientError ? error.message : "The draft could not be saved");
      }
      return null;
    }
  }

  const persistRef = useRef(persist);
  persistRef.current = persist;

  useEffect(() => {
    if (!propertyId || readOnly || status === "approved") return;
    const timer = window.setInterval(() => {
      if (form.formState.isDirty || imagesDirty()) {
        void persistRef.current({ silent: true });
      }
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [propertyId, readOnly, status, form.formState.isDirty]);

  async function goNext() {
    const fields = stepFields[step] ?? [];

    if (fields.length) {
      const valid = await form.trigger(fields);
      if (!valid) {
        toast.error("Check the highlighted fields before continuing");
        return;
      }
    }

    if (step === 3 && images.length < 3) {
      toast.error("Add at least 3 photos before continuing");
      return;
    }

    if (values.listingType === "rent" && step === 4 && !values.rentPeriod) {
      form.setError("rentPeriod", { message: "Choose a rent period" });
      return;
    }

    const saved = await persist({ silent: false });
    if (!saved && !readOnly) return;

    setStep((current) => Math.min(wizardSteps.length - 1, current + 1));
    setMaxStep((current) => Math.max(current, step + 1));
  }

  function goBack() {
    if (step === 0) return;
    setStep((current) => Math.max(0, current - 1));
  }

  function stepForPath(path: string) {
    const index = stepFields.findIndex((fields) => fields.includes(path as keyof WizardValues));
    return index === -1 ? 0 : index;
  }

  function validateAll() {
    const result = wizardSchema.safeParse(form.getValues());
    const issues: Array<{ path: string; message: string }> = [];

    if (!result.success) {
      issues.push(
        ...result.error.issues.map((issue) => ({
          path: issue.path.join(".") || "title",
          message: issue.message,
        })),
      );
    }

    const current = form.getValues();
    if (current.listingType === "rent" && !current.rentPeriod) {
      issues.push({ path: "rentPeriod", message: "Choose a rent period" });
    }
    if (images.length < 3) {
      issues.push({ path: "images", message: "Add at least 3 photos before submitting" });
    }

    setSubmitIssues(issues);

    if (issues.length) {
      const first = issues[0]!;
      setStep(first.path === "images" ? 3 : stepForPath(first.path));
      setMaxStep(wizardSteps.length - 1);
      toast.error("Some details still need attention before review");
      return false;
    }

    return true;
  }

  async function requestSubmit() {
    if (!validateAll()) return;
    const saved = await persist({ silent: false });
    if (!saved) return;
    setConfirmSubmit(true);
  }

  async function confirmSubmitNow() {
    if (!propertyId) return;
    setSubmitting(true);

    try {
      const detail = await api.post<PropertyDetail>(`/properties/${propertyId}/submit`);
      setStatus(detail.status);
      setLoadedProperty(detail);
      setConfirmSubmit(false);
      setStep(wizardSteps.length - 1);
      setMaxStep(wizardSteps.length - 1);
      setSaveState("saved");
      setLastSavedAt(new Date());
      toast.success("Submitted for review");
      void queryClient.invalidateQueries({ queryKey: propertyKeys.mine });
      void queryClient.invalidateQueries({ queryKey: propertyKeys.edit(detail.id) });
    } catch (error) {
      if (error instanceof ApiClientError && Array.isArray(error.details)) {
        const issues = (error.details as Array<{ path?: string; message?: string }>)
          .filter((issue) => issue.message)
          .map((issue) => ({ path: issue.path ?? "images", message: issue.message! }));
        setSubmitIssues(issues);
      }
      toast.error(error instanceof ApiClientError ? error.message : "The listing could not be submitted");
    } finally {
      setSubmitting(false);
    }
  }

  if (!isNewRoute && loadingExisting) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    );
  }

  if (!isNewRoute && loadError) {
    return (
      <div className="rounded-lg border border-line bg-surface p-8 text-center">
        <p className="font-medium text-heading">This listing could not be opened</p>
        <p className="mt-1 text-sm text-body">
          {loadError instanceof ApiClientError
            ? loadError.message
            : "Check the link or return to your listings."}
        </p>
        <Button asChild className="mt-4">
          <Link to="/agent/listings">Back to my listings</Link>
        </Button>
      </div>
    );
  }

  const price = Number(values.price) || 0;
  const size = Number(values.sizeSqft) || 0;
  const pricePerSqft = price > 0 && size > 0 ? Math.round(price / size) : null;
  const checklist = [
    {
      label: "Basics",
      ok:
        values.title.trim().length >= 8 &&
        values.description.trim().length >= 40,
      step: 0,
    },
    {
      label: "Location",
      ok:
        ["street", "city", "state", "zip", "country"].every(
          (key) => (values[key as keyof WizardValues] as string).trim().length > 0,
        ) &&
        Boolean(values.latitude && values.longitude),
      step: 1,
    },
    {
      label: "Details",
      ok: Boolean(values.sizeSqft) && Boolean(values.beds !== ""),
      step: 2,
    },
    { label: "Photos", ok: images.length >= 3, step: 3 },
    {
      label: "Pricing",
      ok: price > 0 && (values.listingType === "sale" || Boolean(values.rentPeriod)),
      step: 4,
    },
  ];

  const saveLabel =
    saveState === "saving"
      ? "Saving…"
      : saveState === "error"
        ? "Not saved"
        : status === "approved"
          ? "Changes will be reviewed"
          : lastSavedAt
            ? `Saved ${lastSavedAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
            : "Draft not saved yet";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            to="/agent/listings"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-strong hover:underline"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            My listings
          </Link>
          <h2 className="mt-2 text-[26px] font-bold leading-tight text-heading sm:text-[30px]">
            {isNewRoute && !propertyId ? "Create a listing" : values.title || "Edit listing"}
          </h2>
          <p className="mt-1 text-sm text-body">
            Five steps plus a review. Drafts autosave while you work.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {status !== "draft" ? <Badge variant={statusTones[status]}>{statusLabels[status]}</Badge> : null}
          <span
            className={cn(
              "rounded-pill px-2.5 py-1",
              saveState === "error" ? "bg-danger-tint text-danger" : "bg-canvas text-body",
            )}
            role="status"
          >
            {saveLabel}
          </span>
        </div>
      </div>

      {loadedProperty && loadedProperty.status !== "draft" ? <StatusPanel property={loadedProperty} /> : null}

      {status === "approved" ? (
        <div className="rounded-md border border-warning/40 bg-warning-tint px-4 py-3 text-sm text-warning-text">
          Saving changes to an approved listing sends it back for review before it is public again.
        </div>
      ) : null}

      <nav aria-label="Listing steps" className="overflow-x-auto rounded-lg border border-line bg-surface">
        <ol className="flex min-w-[640px]">
          {wizardSteps.map((item, index) => {
            const complete = index < step || (step === 5 && checklist.every((entry) => entry.ok));
            const reachable = index <= maxStep;
            return (
              <li key={item.title} className="flex-1">
                <button
                  type="button"
                  onClick={() => reachable && setStep(index)}
                  disabled={!reachable}
                  aria-current={step === index ? "step" : undefined}
                  className={cn(
                    "flex w-full items-center gap-2 border-b-2 px-3 py-3 text-left text-xs transition-colors",
                    step === index
                      ? "border-brand bg-brand-soft/50 text-heading"
                      : reachable
                        ? "border-transparent text-body hover:bg-canvas"
                        : "border-transparent text-muted",
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                      complete
                        ? "bg-success-tint text-success"
                        : step === index
                          ? "bg-brand-strong text-white"
                          : "bg-canvas text-muted",
                    )}
                  >
                    {complete ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : index + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{item.title}</span>
                    <span className="hidden truncate text-[10px] text-muted sm:block">{item.hint}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <fieldset disabled={readOnly} className="min-w-0">
        <form
          onSubmit={(event) => event.preventDefault()}
          noValidate
          className="rounded-lg border border-line bg-surface p-5 sm:p-6"
        >
          {step === 0 ? (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-semibold text-heading">Basics</h3>
                <p className="mt-1 text-sm text-body">Start with what you are listing and why it stands out.</p>
              </div>

              <Field label="Listing title" htmlFor="wizard-title" required error={form.formState.errors.title?.message}>
                <Input
                  id="wizard-title"
                  placeholder="Sunlit brownstone with a private garden"
                  aria-invalid={Boolean(form.formState.errors.title) || undefined}
                  {...form.register("title")}
                />
              </Field>

              <div>
                <p className="mb-1.5 text-sm font-medium text-heading">
                  Listing type<span className="ml-0.5 text-danger">*</span>
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(
                    [
                      { value: "sale", label: "For sale", hint: "A one-time sale price" },
                      { value: "rent", label: "For rent", hint: "Monthly, weekly, or nightly" },
                    ] as Array<{ value: ListingType; label: string; hint: string }>
                  ).map((option) => (
                    <label
                      key={option.value}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-md border p-3.5 transition-colors",
                        values.listingType === option.value
                          ? "border-brand bg-brand-soft/40"
                          : "border-line hover:border-brand/50",
                      )}
                    >
                      <input
                        type="radio"
                        value={option.value}
                        className="mt-1 h-4 w-4 text-brand-strong focus:ring-brand"
                        {...form.register("listingType")}
                      />
                      <span>
                        <span className="block text-sm font-medium text-heading">{option.label}</span>
                        <span className="block text-xs text-body">{option.hint}</span>
                      </span>
                    </label>
                  ))}
                </div>
                {form.formState.errors.listingType ? (
                  <p className="mt-1 text-xs text-danger">{form.formState.errors.listingType.message}</p>
                ) : null}
              </div>

              <Field label="Property type" htmlFor="wizard-type" required error={form.formState.errors.propertyType?.message}>
                <select
                  id="wizard-type"
                  className="h-12 w-full rounded-md border border-line bg-surface px-3 text-[15px] text-heading focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                  {...form.register("propertyType")}
                >
                  {Object.entries(propertyTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                label="Description"
                htmlFor="wizard-description"
                required
                error={form.formState.errors.description?.message}
                hint={`${values.description.length} of 4,000 characters · at least 40`}
              >
                <textarea
                  id="wizard-description"
                  rows={6}
                  className="w-full resize-y rounded-md border border-line bg-surface px-3.5 py-3 text-[15px] text-heading placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                  placeholder="Describe the rooms, light, outdoor space, and what makes the location work day to day."
                  aria-invalid={Boolean(form.formState.errors.description) || undefined}
                  {...form.register("description")}
                />
              </Field>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-semibold text-heading">Location</h3>
                <p className="mt-1 text-sm text-body">
                  Buyers see the street and neighborhood. The map pin powers search later, so make it accurate.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Street address" htmlFor="wizard-street" required error={form.formState.errors.street?.message} className="sm:col-span-2">
                  <Input id="wizard-street" autoComplete="address-line1" {...form.register("street")} />
                </Field>
                <Field label="City" htmlFor="wizard-city" required error={form.formState.errors.city?.message}>
                  <Input id="wizard-city" list="haven-cities" autoComplete="address-level2" {...form.register("city")} />
                  <datalist id="haven-cities">
                    {citySuggestions.map((city) => (
                      <option key={city} value={city} />
                    ))}
                  </datalist>
                </Field>
                <Field label="State" htmlFor="wizard-state" required error={form.formState.errors.state?.message}>
                  <Input id="wizard-state" autoComplete="address-level1" {...form.register("state")} />
                </Field>
                <Field label="ZIP code" htmlFor="wizard-zip" required error={form.formState.errors.zip?.message}>
                  <Input id="wizard-zip" autoComplete="postal-code" {...form.register("zip")} />
                </Field>
                <Field label="Country" htmlFor="wizard-country" required error={form.formState.errors.country?.message}>
                  <Input id="wizard-country" autoComplete="country-name" {...form.register("country")} />
                </Field>
                <Field label="Neighborhood" htmlFor="wizard-neighborhood" hint="Optional but helps buyers compare areas." className="sm:col-span-2">
                  <Input id="wizard-neighborhood" {...form.register("neighborhood")} />
                </Field>
              </div>

              <div className="rounded-md border border-line bg-canvas p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-heading">Map pin</p>
                    <p className="text-xs text-body">Latitude and longitude place the home on the map.</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const coords = cityCoordinates[values.city.trim().toLowerCase()];
                      if (!coords) {
                        toast.info("Pick a city from the suggestions or enter coordinates manually");
                        return;
                      }
                      form.setValue("latitude", String(coords.lat), { shouldValidate: true });
                      form.setValue("longitude", String(coords.lng), { shouldValidate: true });
                    }}
                  >
                    Use city center
                  </Button>
                </div>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <Field label="Latitude" htmlFor="wizard-lat" required error={form.formState.errors.latitude?.message}>
                    <Input id="wizard-lat" inputMode="decimal" {...form.register("latitude")} />
                  </Field>
                  <Field label="Longitude" htmlFor="wizard-lng" required error={form.formState.errors.longitude?.message}>
                    <Input id="wizard-lng" inputMode="decimal" {...form.register("longitude")} />
                  </Field>
                </div>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-semibold text-heading">Property details</h3>
                <p className="mt-1 text-sm text-body">Numbers buyers filter by. Leave an optional field blank if it does not apply.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Bedrooms" htmlFor="wizard-beds" error={form.formState.errors.beds?.message}>
                  <Input id="wizard-beds" inputMode="numeric" {...form.register("beds")} />
                </Field>
                <Field label="Bathrooms" htmlFor="wizard-baths" error={form.formState.errors.baths?.message}>
                  <Input id="wizard-baths" inputMode="decimal" {...form.register("baths")} />
                </Field>
                <Field label="Garages" htmlFor="wizard-garages" error={form.formState.errors.garages?.message}>
                  <Input id="wizard-garages" inputMode="numeric" {...form.register("garages")} />
                </Field>
                <Field label="Living area (sq ft)" htmlFor="wizard-size" required error={form.formState.errors.sizeSqft?.message}>
                  <Input id="wizard-size" inputMode="numeric" {...form.register("sizeSqft")} />
                </Field>
                <Field label="Lot size (sq ft)" htmlFor="wizard-lot" error={form.formState.errors.lotSizeSqft?.message}>
                  <Input id="wizard-lot" inputMode="numeric" {...form.register("lotSizeSqft")} />
                </Field>
                <Field label="Year built" htmlFor="wizard-year" error={form.formState.errors.yearBuilt?.message}>
                  <Input id="wizard-year" inputMode="numeric" {...form.register("yearBuilt")} />
                </Field>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-heading">Amenities</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {amenityOptions.map((amenity) => (
                    <label key={amenity} className="flex items-center gap-2 text-sm text-body">
                      <input
                        type="checkbox"
                        value={amenity}
                        className="h-4 w-4 rounded-sm border-line text-brand-strong focus:ring-brand"
                        {...form.register("amenities")}
                      />
                      {amenity}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-semibold text-heading">Photos</h3>
                <p className="mt-1 text-sm text-body">
                  At least 3 photos are required to submit. The cover photo appears on cards and search results.
                </p>
              </div>
              <ImageUploader
                images={images}
                onChange={setImages}
                titleHint={values.title || "Listing photo"}
                disabled={readOnly}
                propertyId={propertyId}
              />
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-semibold text-heading">Pricing</h3>
                <p className="mt-1 text-sm text-body">
                  Set the asking price. For rentals, choose how often the rent is charged.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={values.listingType === "rent" ? "Monthly rent (USD)" : "Sale price (USD)"} htmlFor="wizard-price" required error={form.formState.errors.price?.message}>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">$</span>
                    <Input id="wizard-price" inputMode="numeric" className="pl-7" {...form.register("price")} />
                  </div>
                </Field>

                {values.listingType === "rent" ? (
                  <Field label="Rent period" htmlFor="wizard-period" required error={form.formState.errors.rentPeriod?.message}>
                    <select
                      id="wizard-period"
                      className="h-12 w-full rounded-md border border-line bg-surface px-3 text-[15px] text-heading focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                      {...form.register("rentPeriod")}
                    >
                      <option value="monthly">Monthly</option>
                      <option value="weekly">Weekly</option>
                      <option value="nightly">Nightly</option>
                    </select>
                  </Field>
                ) : null}
              </div>

              <dl className="grid gap-3 rounded-md border border-line bg-canvas p-4 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-muted">Price</dt>
                  <dd className="mt-1 font-semibold text-heading tabular">
                    {price > 0
                      ? values.listingType === "rent"
                        ? formatRent(price, (values.rentPeriod || "monthly") as RentPeriod)
                        : formatPrice(price)
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Living area</dt>
                  <dd className="mt-1 font-semibold text-heading tabular">{size > 0 ? formatArea(size) : "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Price per sq ft</dt>
                  <dd className="mt-1 font-semibold text-heading tabular">
                    {pricePerSqft ? `$${pricePerSqft}` : "—"}
                  </dd>
                </div>
              </dl>
            </div>
          ) : null}

          {step === 5 ? (
            <div className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-heading">Review and submit</h3>
                  <p className="mt-1 text-sm text-body">
                    Most listings are reviewed within one business day. You can keep editing drafts.
                  </p>
                </div>
                {readOnly ? <Badge variant="outline">Read only while in review</Badge> : null}
              </div>

              {submitIssues.length ? (
                <div role="alert" className="rounded-md border border-danger/30 bg-danger-tint px-4 py-3 text-sm text-danger">
                  <p className="font-semibold">Still need attention</p>
                  <ul className="mt-1.5 list-disc space-y-1 pl-5">
                    {submitIssues.map((issue, index) => (
                      <li key={`${issue.path}-${index}`}>{issue.message || issue.path}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <ul className="space-y-2">
                {checklist.map((item) => (
                  <li key={item.label} className="flex items-center justify-between gap-3 rounded-md border border-line px-3.5 py-2.5 text-sm">
                    <span className="flex items-center gap-2">
                      {item.ok ? (
                        <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-warning-text" aria-hidden="true" />
                      )}
                      <span className="font-medium text-heading">{item.label}</span>
                    </span>
                    <button
                      type="button"
                      className="text-xs font-medium text-brand-strong hover:underline"
                      onClick={() => setStep(item.step)}
                    >
                      {item.ok ? "Edit" : "Complete"}
                    </button>
                  </li>
                ))}
              </ul>

              <div className="rounded-md border border-line bg-canvas p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-heading">{values.title || "Untitled listing"}</p>
                    <p className="mt-0.5 text-xs text-body">
                      {[values.street, values.city, values.state, values.zip].filter(Boolean).join(", ") || "No address yet"}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-heading">
                      {price > 0
                        ? values.listingType === "rent"
                          ? formatRent(price, (values.rentPeriod || "monthly") as RentPeriod)
                          : formatPrice(price)
                        : "No price yet"}
                    </p>
                  </div>
                  {images[0] ? (
                    <img src={images[0].url} alt="" className="h-20 w-28 rounded-sm object-cover" />
                  ) : null}
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-3 text-xs sm:grid-cols-4">
                  <div>
                    <dt className="text-muted">Type</dt>
                    <dd className="font-medium text-heading">{propertyTypeLabels[values.propertyType]}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Beds</dt>
                    <dd className="font-medium text-heading tabular">{values.beds || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Baths</dt>
                    <dd className="font-medium text-heading tabular">{values.baths || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Photos</dt>
                    <dd className="font-medium text-heading tabular">{images.length}</dd>
                  </div>
                </dl>
              </div>
            </div>
          ) : null}
        </form>
      </fieldset>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="outline" onClick={goBack} disabled={step === 0 || submitting}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => void persist({ silent: false })}
            disabled={readOnly || savingBusy(saveState)}
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            Save draft
          </Button>

          {step < wizardSteps.length - 1 ? (
            <Button type="button" onClick={() => void goNext()} disabled={submitting || readOnly}>
              Next
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => void requestSubmit()}
              loading={submitting}
              disabled={readOnly || status !== "draft"}
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              Submit for review
            </Button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmSubmit}
        onOpenChange={setConfirmSubmit}
        title="Submit this listing for review?"
        description="An administrator will check the details and photos. Most reviews finish within one business day. You cannot edit the listing while it is under review."
        confirmLabel="Submit for review"
        loading={submitting}
        onConfirm={() => void confirmSubmitNow()}
      />
    </div>
  );
}

function savingBusy(state: "idle" | "saving" | "saved" | "error") {
  return state === "saving";
}