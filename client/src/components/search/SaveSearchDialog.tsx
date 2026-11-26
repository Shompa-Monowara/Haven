import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ApiClientError, api } from "@/lib/api";
import { engagementKeys } from "@/lib/queries/engagement";
import { criteriaFromState, type SearchState } from "@/lib/search/search-state";
import {
  frequencyLabels,
  type AlertFrequency,
  type SavedSearchDto,
} from "@/types/engagement";

function defaultName(state: SearchState) {
  if (state.city) {
    return `${state.listingType === "rent" ? "Rentals" : state.listingType === "sale" ? "Homes" : "Properties"} in ${state.city}`;
  }
  if (state.propertyTypes.length) {
    const type = state.propertyTypes[0]!;
    return `${type.charAt(0).toUpperCase()}${type.slice(1)} listings`;
  }
  return "My home search";
}

interface SaveSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: SearchState;
  matchCount: number;
}

export function SaveSearchDialog({ open, onOpenChange, state, matchCount }: SaveSearchDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(() => defaultName(state));
  const [frequency, setFrequency] = useState<AlertFrequency>("daily");
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [inAppAlerts, setInAppAlerts] = useState(true);

  useEffect(() => {
    if (open) setName(defaultName(state));
    // Reset the name only when the dialog opens, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const create = useMutation({
    mutationFn: () =>
      api.post<SavedSearchDto>("/saved-searches", {
        name: name.trim(),
        criteria: criteriaFromState(state),
        frequency,
        emailAlerts,
        inAppAlerts,
      }),
    onSuccess: () => {
      toast.success("Search saved. We'll email you when a new home matches.");
      void queryClient.invalidateQueries({ queryKey: engagementKeys.savedSearches });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiClientError ? error.message : "The search could not be saved",
      );
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-heading">Save this search</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-body">
            {matchCount.toLocaleString()} {matchCount === 1 ? "home matches" : "homes match"} right
            now. We will watch for new listings that fit these filters.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!name.trim()) {
              toast.error("Give this search a name");
              return;
            }
            create.mutate();
          }}
          className="space-y-4"
        >
          <div>
            <label htmlFor="save-search-name" className="mb-1.5 block text-sm font-medium text-heading">
              Name
            </label>
            <Input
              id="save-search-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="save-search-frequency" className="mb-1.5 block text-sm font-medium text-heading">
              Alert frequency
            </label>
            <select
              id="save-search-frequency"
              value={frequency}
              onChange={(event) => setFrequency(event.target.value as AlertFrequency)}
              className="h-11 w-full rounded-md border border-line bg-surface px-3 text-sm text-heading focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            >
              {Object.entries(frequencyLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {frequency === "instant" ? (
              <p className="mt-1 text-xs text-muted">
                Instant alerts notify you as soon as a matching home is approved.
              </p>
            ) : null}
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-heading">Channels</legend>
            <label className="flex items-center gap-2 text-sm text-body">
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(event) => setEmailAlerts(event.target.checked)}
                className="h-4 w-4 rounded-sm border-line text-brand-strong focus:ring-brand"
              />
              Email digest
            </label>
            <label className="flex items-center gap-2 text-sm text-body">
              <input
                type="checkbox"
                checked={inAppAlerts}
                onChange={(event) => setInAppAlerts(event.target.checked)}
                className="h-4 w-4 rounded-sm border-line text-brand-strong focus:ring-brand"
              />
              In-app alerts
            </label>
          </fieldset>

          <p className="flex items-start gap-2 rounded-md bg-canvas px-3 py-2 text-xs text-body">
            <Bell className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-strong" aria-hidden="true" />
            You can edit or delete this search anytime from Saved homes.
          </p>

          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending}>
              <Save className="h-4 w-4" aria-hidden="true" />
              Save search
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}