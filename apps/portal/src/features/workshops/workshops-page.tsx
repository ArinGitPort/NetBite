import {
  BookOpen,
  Cable,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Classes, Gradebook } from "@/features/classes";
import { PageHeader } from "@/components/layout/page-header";
import { LoadingState, StatusHeading } from "@/components/ui/admin-primitives";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SelectField } from "@/components/ui/select";
import type {
  WorkshopRow,
} from "@/lib/api/types";
import * as workshopApi from "@/lib/api/workshop-service";
import { LessonWorkspace } from "@/features/workshops/lesson-workspace";
import { TopologyEditor } from "@/features/workshops/topology-editor";
import { WorkshopDetailsDialog } from "@/features/workshops/workshop-details-dialog";
import { useWorkshopStudio, type WorkshopArea } from "@/features/workshops/hooks/use-workshop-studio";
import { WorkshopAssessmentsWorkspace } from "@/features/workshops/workshop-assessments-workspace";
import { TopologyDetailsDialog } from "@/features/workshops/topology-details-dialog";
import { WorkshopNotice } from "@/features/workshops/workshop-notice";
import { getWorkshopPageCopy } from "@/features/workshops/workshop-page-copy";
import { useGuardedTransition } from "@/app/providers/unsaved-changes-provider";

export function WorkshopStudio({ area }: { area: WorkshopArea }) {
  const requestTransition = useGuardedTransition();
  const {
    loading, workshops, setWorkshops, selectedId, setSelectedId, lessons,
    topologies, setTopologies, assessments, setAssessments, classes, versions, selectedLesson,
    setSelectedLesson, selectedAssessment, setSelectedAssessment,
    selectedTopology, setSelectedTopology, collectionView, setCollectionView,
    gradeRows, gradebookLoading, notice, setNotice, error, setError, detailsMode, setDetailsMode,
    addingLesson, topologyDetailsOpen, setTopologyDetailsOpen, topologyName,
    setTopologyName, savingTopologyName, selectedWorkshop, load, create,
    saveDetails, deleteDraft, updateLesson, addLesson, deleteLesson,
    updateAssessment, addTopology, selectedTopologyRow, topologyReferenceCount,
    openTopologyDetails, renameTopology, deleteTopology,
  } = useWorkshopStudio(area);
  const page = getWorkshopPageCopy(area);

  if (loading)
    return (
      <>
        <PageHeader
          description={page.detail}
          label={page.label}
          title={page.title}
        />
        <section className="rounded-panel border border-line bg-surface shadow-panel">
          <LoadingState label="Loading your instructor workspace" />
        </section>
      </>
    );

  if (!workshops.length)
    return (
      <>
        <PageHeader
          actions={
            <Button
              onClick={() => setDetailsMode({ kind: "create" })}
              tone="primary"
            >
              <Plus />
              CREATE COLLECTION
            </Button>
          }
          description={page.detail}
          label={page.label}
          title={page.title}
        />
        <WorkshopNotice
          message={error}
          error
          onDismiss={() => setError(undefined)}
        />
        <section className="grid min-h-[300px] place-items-center content-center gap-3 rounded-panel border border-line bg-surface p-5 text-center text-sm shadow-panel [&>svg]:size-9 [&>svg]:text-signal-green [&>p]:max-w-xl">
          <GraduationCap />
          <strong>No lesson collections yet</strong>
          <p>
            Start a collection for one topic or unit. It remains private while
            you add lessons and activities. Publish it when it is ready, then
            assign it to a class.
          </p>
          <Button
            onClick={() => setDetailsMode({ kind: "create" })}
            tone="primary"
          >
            <Plus />
            CREATE YOUR FIRST COLLECTION
          </Button>
        </section>
        {detailsMode ? (
          <WorkshopDetailsDialog
            mode={detailsMode}
            onClose={() => setDetailsMode(undefined)}
            onCreate={create}
            onSave={saveDetails}
            onDelete={deleteDraft}
          />
        ) : null}
      </>
    );

  return (
    <>
      <PageHeader
        actions={
          area === "workshops" ? (
            <Button
              onClick={() => setDetailsMode({ kind: "create" })}
              tone="primary"
            >
              <Plus />
              NEW COLLECTION
            </Button>
          ) : undefined
        }
        description={page.detail}
        label={page.label}
        title={page.title}
      />
      <WorkshopNotice
        message={error || notice}
        error={Boolean(error)}
        onDismiss={() => {
          if (error) setError(undefined);
          else setNotice(undefined);
        }}
      />
      <div className="grid min-h-[680px] min-w-0 grid-cols-[250px_minmax(0,1fr)] overflow-clip rounded-panel border border-line bg-surface shadow-panel max-lg:grid-cols-1">
        <aside className="themed-scrollbar grid min-w-0 content-start gap-2 overflow-y-auto border-r border-line bg-sidebar p-3 max-lg:border-b max-lg:border-r-0 [&>strong]:px-2 [&>strong]:py-2 [&>strong]:font-mono [&>strong]:text-[0.62rem] [&>strong]:text-muted">
          <strong>YOUR COLLECTIONS</strong>
          {workshops.map((workshop) => (
            <button
              className={`grid min-h-16 min-w-0 gap-1 rounded-control border px-3 py-2 text-left ${workshop.id === selectedId ? "border-signal-orange bg-raised" : "border-transparent text-muted hover:border-line hover:bg-raised"}`}
              key={workshop.id}
              onClick={() => requestTransition(() => setSelectedId(workshop.id))}
            >
              <span className="break-words font-semibold">
                {workshop.title}
              </span>
              <small className="block text-muted">
                {workshop.current_version_id ? "Published" : "Draft"}
              </small>
            </button>
          ))}
        </aside>
        <section className="min-w-0 bg-surface p-5 max-sm:p-4">
          {selectedWorkshop && area === "workshops" ? (
            <>
              <div className="mb-5 flex min-h-20 flex-wrap items-start justify-between gap-5 border-b border-line pb-5">
                <div className="min-w-0">
                  <StatusHeading
                    status={
                      <span className="inline-flex min-h-6 w-fit items-center rounded-full border border-line bg-raised px-2.5 font-mono text-[0.58rem] font-semibold uppercase tracking-[0.045em] text-muted">
                        {selectedWorkshop.archived
                          ? "ARCHIVED"
                          : selectedWorkshop.current_version_id
                            ? "PUBLISHED COLLECTION"
                            : "DRAFT COLLECTION"}
                      </span>
                    }
                    title={selectedWorkshop.title}
                  />
                  <p className="mb-2 mt-2 max-w-2xl text-sm leading-6 text-muted">
                    {selectedWorkshop.description ||
                      "Add a short description so students know what this collection covers."}
                  </p>
                  <details className="text-xs text-muted [&>summary]:cursor-pointer [&>summary]:py-2 [&>div]:grid [&>div]:grid-cols-[1fr_auto_auto] [&>div]:gap-3 [&>div]:border-t [&>div]:border-line [&>div]:py-2">
                    <summary>
                      {versions.length} published version
                      {versions.length === 1 ? "" : "s"}
                    </summary>
                    {versions.map((version) => (
                      <div key={version.id}>
                        <strong>Version {version.version}</strong>
                        <span>
                          {new Date(version.published_at).toLocaleString()}
                        </span>
                        <code>{version.checksum.slice(0, 12)}</code>
                      </div>
                    ))}
                  </details>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-control border border-transparent bg-transparent px-3 text-xs font-semibold text-muted hover:border-line hover:bg-raised hover:text-copy disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4"
                    onClick={() =>
                      setDetailsMode({
                        kind: "edit",
                        workshop: selectedWorkshop,
                        canDelete:
                          versions.length === 0 &&
                          !classes.some(
                            (row) => row.workshop_id === selectedWorkshop.id,
                          ),
                        deleteReason:
                          "Published collections and collections used by a class must be archived so student access and records remain intact.",
                      })
                    }
                  >
                    <Pencil />
                    EDIT DETAILS
                  </button>
                  {selectedWorkshop.archived ? (
                    <button
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-control border border-transparent bg-transparent px-3 text-xs font-semibold text-muted hover:border-line hover:bg-raised hover:text-copy disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4"
                      onClick={() => void workshopApi.saveWorkshop({ ...selectedWorkshop, archived: false }).then(() => {
                        setNotice("Lesson collection restored.");
                        return load();
                      }).catch((reason: Error) => setError(reason.message))}
                      type="button"
                    >
                      RESTORE COLLECTION
                    </button>
                  ) : (
                    <ConfirmationDialog
                      busyLabel="ARCHIVING..."
                      confirmLabel="ARCHIVE COLLECTION"
                      description={`“${selectedWorkshop.title}” will leave the active workspace. Existing classes and published versions remain readable.`}
                      intent="warning"
                      onConfirm={async () => {
                        try {
                          await workshopApi.saveWorkshop({ ...selectedWorkshop, archived: true });
                          setNotice("Lesson collection archived. Existing classes remain readable.");
                          await load();
                        } catch (reason) {
                          const message = reason instanceof Error ? reason.message : "The lesson collection could not be archived.";
                          setError(message);
                          throw new Error(message);
                        }
                      }}
                      title="Archive this lesson collection?"
                      trigger={<button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-control border border-transparent bg-transparent px-3 text-xs font-semibold text-muted hover:border-line hover:bg-raised hover:text-copy" type="button">ARCHIVE COLLECTION</button>}
                    />
                  )}
                  <ConfirmationDialog
                    busyLabel="PUBLISHING..."
                    confirmLabel="PUBLISH COLLECTION"
                    description={`Publish the current version of “${selectedWorkshop.title}” so it can be assigned to learners? Later draft edits will not change this release.`}
                    intent="warning"
                    onConfirm={async () => {
                      try {
                        await workshopApi.publishWorkshop(selectedWorkshop.id);
                        setNotice("Lesson collection published. You can now assign it to a class.");
                        await load();
                      } catch (reason) {
                        const message = reason instanceof Error ? reason.message : "The lesson collection could not be published.";
                        setError(message);
                        throw new Error(message);
                      }
                    }}
                    title="Publish this lesson collection?"
                    trigger={
                      <button
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-copy bg-copy px-4 text-xs font-semibold text-canvas hover:bg-copy/85 hover:text-canvas active:bg-copy/75 disabled:pointer-events-none disabled:border-line/60 disabled:bg-raised/70 disabled:text-muted/75 [&_svg]:size-4"
                        disabled={!lessons.length || selectedWorkshop.archived}
                        type="button"
                      >
                        <CheckCircle2 /> PUBLISH COLLECTION
                      </button>
                    }
                  />
                </div>
              </div>
              <Tabs
                className="mb-5"
                onValueChange={(value) => requestTransition(() =>
                  setCollectionView(value as "lessons" | "topologies")
                )}
                value={collectionView}
              >
                <TabsList aria-label="Collection content">
                  <TabsTrigger
                    aria-label={`Lessons, ${lessons.length} ${lessons.length === 1 ? "item" : "items"}`}
                    className="inline-flex items-center"
                    onClick={() => requestTransition(() => setCollectionView("lessons"))}
                    value="lessons"
                  >
                    <BookOpen aria-hidden="true" className="mr-2 size-4" />
                    LESSONS
                    <span className="ml-2 rounded-full bg-raised px-2 py-0.5 font-mono text-[0.6rem]">
                      {lessons.length}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger
                    aria-label={`Topologies, ${topologies.length} ${topologies.length === 1 ? "item" : "items"}`}
                    className="inline-flex items-center"
                    onClick={() => requestTransition(() => setCollectionView("topologies"))}
                    value="topologies"
                  >
                    <Cable aria-hidden="true" className="mr-2 size-4" />
                    TOPOLOGIES
                    <span className="ml-2 rounded-full bg-raised px-2 py-0.5 font-mono text-[0.6rem]">
                      {topologies.length}
                    </span>
                  </TabsTrigger>
                </TabsList>
                <TabsContent className="mt-5" value="topologies">
                  {topologies.length && selectedTopology ? (
                    <div className="grid gap-4">
                      <div className="flex flex-wrap items-end gap-2 border-b border-line pb-4">
                        <label className="grid min-w-0 flex-1 gap-1.5 text-[0.7rem] font-semibold text-copy sm:max-w-sm">
                          <span>Selected topology</span>
                          <SelectField
                            allowEmpty={false}
                            ariaLabel="Selected topology"
                            onValueChange={(value) => requestTransition(() => setSelectedTopology(value))}
                            options={topologies.map((row) => ({
                              value: row.stable_id,
                              label: String(
                                row.definition.title ?? "Untitled topology",
                              ),
                            }))}
                            placeholder="Choose a topology"
                            value={selectedTopology}
                          />
                        </label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              aria-label="Create topology"
                              disabled={selectedWorkshop.archived}
                              onClick={() => requestTransition(addTopology)}
                              size="icon"
                              tone="secondary"
                            >
                              <Plus />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Create topology</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              aria-label="Edit topology details"
                              disabled={!selectedTopologyRow || selectedWorkshop.archived}
                              onClick={openTopologyDetails}
                              size="icon"
                              tone="outline"
                            >
                              <Pencil />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            Rename or delete this topology
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <TopologyEditor
                        key={selectedTopology}
                        row={selectedTopologyRow!}
                        onSaved={(saved) => {
                          setTopologies((value) =>
                            value.map((row) =>
                              row.stable_id === saved.stable_id ? saved : row,
                            ),
                          );
                        }}
                      />
                    </div>
                  ) : (
                    <div className="grid min-h-[360px] place-items-center content-center gap-3 rounded-panel border border-dashed border-line bg-canvas p-6 text-center text-muted">
                      <Cable className="size-8" />
                      <strong className="text-copy">No topologies yet</strong>
                      <p className="m-0 max-w-lg text-sm leading-6">
                        Create a read-only network diagram, then insert it into
                        any lesson using a Network diagram content block.
                      </p>
                      <Button onClick={addTopology} tone="secondary">
                        <Plus />
                        CREATE FIRST TOPOLOGY
                      </Button>
                    </div>
                  )}
                </TabsContent>
                <TabsContent className="mt-5" value="lessons">
                  <LessonWorkspace
                    addingLesson={addingLesson}
                    archived={selectedWorkshop.archived}
                    collectionTitle={selectedWorkshop.title}
                    lessons={lessons}
                    onAddLesson={() => requestTransition(() => void addLesson())}
                    onChange={updateLesson}
                    onDelete={deleteLesson}
                    onError={setError}
                    onSaved={() => setNotice("Lesson saved.")}
                    onSelectLesson={(id) => requestTransition(() => setSelectedLesson(id))}
                    selectedLessonId={selectedLesson}
                    topologies={topologies}
                  />
                </TabsContent>
              </Tabs>
            </>
          ) : null}
          {selectedWorkshop && area === "workshop-assessments" ? (
            <WorkshopAssessmentsWorkspace
              workshop={selectedWorkshop}
              assessments={assessments}
              selectedId={selectedAssessment}
              onAssessmentsChange={setAssessments}
              onSelect={setSelectedAssessment}
              onNotice={setNotice}
              onError={setError}
            />
          ) : null}          {selectedWorkshop && area === "classes" ? (
            <Classes
              selected={selectedWorkshop}
              classes={classes.filter(
                (row) => row.workshop_id === selectedWorkshop.id,
              )}
              onCreated={() => void load()}
              onNotice={setNotice}
            />
          ) : null}
          {selectedWorkshop && area === "gradebook" ? (
            <Gradebook loading={gradebookLoading} rows={gradeRows} />
          ) : null}
        </section>
      </div>
      {topologyDetailsOpen && selectedTopologyRow ? (
        <TopologyDetailsDialog
          row={selectedTopologyRow}
          name={topologyName}
          saving={savingTopologyName}
          referenceCount={topologyReferenceCount}
          onNameChange={setTopologyName}
          onClose={() => setTopologyDetailsOpen(false)}
          onSave={() => void renameTopology()}
          onDelete={deleteTopology}
        />
      ) : null}      {detailsMode ? (
        <WorkshopDetailsDialog
          mode={detailsMode}
          onClose={() => setDetailsMode(undefined)}
          onCreate={create}
          onSave={saveDetails}
          onDelete={deleteDraft}
        />
      ) : null}
    </>
  );
}
