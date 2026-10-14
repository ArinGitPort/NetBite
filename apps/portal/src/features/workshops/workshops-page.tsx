import {
  BookOpen,
  Cable,
  ClipboardCheck,
  GraduationCap,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { Classes, Gradebook } from "@/features/classes";
import { PageHeader } from "@/components/layout/page-header";
import { LoadingState, StatusHeading } from "@/components/ui/admin-primitives";
import { SelectField } from "@/components/ui/select";
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
import type {
  WorkshopRow,
} from "@/lib/api/types";
import * as workshopApi from "@/lib/api/workshop-service";
import { LessonWorkspace } from "@/features/workshops/lesson-workspace";
import { TopologyEditor } from "@/features/workshops/topology-editor";
import { WorkshopDetailsDialog } from "@/features/workshops/workshop-details-dialog";
import { useWorkshopStudio, type WorkshopArea } from "@/features/workshops/hooks/use-workshop-studio";
import { WorkshopAssessmentsWorkspace } from "@/features/workshops/workshop-assessments-workspace";
import { CollectionNavigator, type CollectionItem } from "@/features/workshops/collection-navigator";
import { TopologyDetailsDialog } from "@/features/workshops/topology-details-dialog";
import { WorkshopNotice } from "@/features/workshops/workshop-notice";
import { PublishCollectionAction } from "@/features/workshops/publish-collection-action";
import { getWorkshopPageCopy } from "@/features/workshops/workshop-page-copy";
import { useGuardedTransition } from "@/app/providers/unsaved-changes-provider";

export function WorkshopStudio({ area }: { area: WorkshopArea }) {
  const requestTransition = useGuardedTransition();
  const [selectedManageClassId, setSelectedManageClassId] = useState<string>();
  const {
    loading, workshops, setWorkshops, selectedId, setSelectedId, lessons,
    topologies, setTopologies, assessments, setAssessments, classes, versions, contentWorkshopId, selectedLesson,
    setSelectedLesson, selectedAssessment, setSelectedAssessment,
    selectedTopology, setSelectedTopology, collectionView, setCollectionView,
    gradeRows, gradebookLoading, selectedClass, setSelectedGradeClassId, notice, setNotice, error, setError, detailsMode, setDetailsMode,
    addingLesson, topologyDetailsOpen, setTopologyDetailsOpen, topologyName,
    setTopologyName, savingTopologyName, selectedWorkshop, load, create,
    saveDetails, deleteDraft, updateLesson, addLesson, deleteLesson,
    updateAssessment, addTopology, selectedTopologyRow, topologyReferenceCount,
    openTopologyDetails, renameTopology, deleteTopology,
  } = useWorkshopStudio(area);
  const page = getWorkshopPageCopy(area);
  const currentClasses = classes.filter((row) => row.workshop_id === selectedId);
  const activeManageClassId = currentClasses.some((row) => row.id === selectedManageClassId)
    ? selectedManageClassId : currentClasses[0]?.id;
  const contentReady = contentWorkshopId === selectedId;
  const collectionItems: CollectionItem[] = area === "workshops" && contentReady ? [
    ...lessons.map((row) => ({
      id: row.id, label: String(row.draft.title ?? "Untitled lesson"), kind: "lesson" as const,
      active: collectionView === "lessons" && selectedLesson === row.id,
      onSelect: () => requestTransition(() => { setCollectionView("lessons"); setSelectedLesson(row.id); }),
    })),
  ] : area === "workshop-assessments" && contentReady ? assessments.map((row) => ({
    id: row.id, label: row.title, kind: "assessment" as const, active: selectedAssessment === row.id,
    onSelect: () => requestTransition(() => setSelectedAssessment(row.id)),
  })) : area === "classes" || area === "gradebook" ? currentClasses.map((row) => ({
    id: row.id, label: row.title, detail: row.join_code,
    enrollment: row.join_enabled ? "open" as const : "closed" as const,
    kind: "class" as const,
    active: area === "classes" ? activeManageClassId === row.id : selectedClass?.id === row.id,
    onSelect: () => requestTransition(() => area === "classes" ? setSelectedManageClassId(row.id) : setSelectedGradeClassId(row.id)),
  })) : [];
  const emptyCollectionLabel = area === "workshops" ? "No lessons yet."
    : area === "workshop-assessments" ? "No assessments yet."
      : "No classes yet.";

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
        <CollectionNavigator
          emptyLabel={emptyCollectionLabel}
          filterClasses={area === "classes" || area === "gradebook"}
          items={collectionItems}
          onSelectCollection={(id) => requestTransition(() => setSelectedId(id))}
          selectedId={selectedId}
          workshops={workshops}
        />
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
                <div aria-label="Collection actions" className="flex flex-wrap items-center justify-end gap-2" role="group">
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
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={() => setDetailsMode({ kind: "create" })} tone="primary">
                        <Plus />
                        NEW COLLECTION
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Create another private lesson collection.</TooltipContent>
                  </Tooltip>
                  <PublishCollectionAction
                    archived={selectedWorkshop.archived}
                    assessmentCount={assessments.filter((row) => !row.archived).length}
                    contentReady={contentReady}
                    hasPublishedVersions={versions.length > 0}
                    lessonCount={lessons.filter((row) => !row.archived).length}
                    onPublish={async () => {
                      try {
                        await workshopApi.publishWorkshop(selectedWorkshop.id);
                        setNotice("Collection published. Open Classes to create a class and share its invitation.");
                        await load();
                      } catch (reason) {
                        const message = reason instanceof Error ? reason.message : "The lesson collection could not be published.";
                        setError(message);
                        throw new Error(message);
                      }
                    }}
                    title={selectedWorkshop.title}
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
                              label: String(row.definition.title ?? "Untitled topology"),
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
                    onAddStarter={(starter) => requestTransition(() => void addLesson(starter))}
                    onChange={updateLesson}
                    onDelete={deleteLesson}
                    onError={setError}
                    onSaved={() => setNotice("Lesson saved.")}
                    selectedLessonId={selectedLesson}
                    templateNotice={notice?.includes("template created and opened") ? notice : undefined}
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
              key={selectedWorkshop.id}
              selected={selectedWorkshop}
              classes={currentClasses}
              selectedClassId={activeManageClassId}
              onSelectClass={setSelectedManageClassId}
              onCreated={load}
              onNotice={setNotice}
            />
          ) : null}
          {selectedWorkshop && area === "gradebook" ? (
            <div className="grid gap-5">
              <Gradebook classId={selectedClass?.id} loading={gradebookLoading} rows={gradeRows} />
            </div>
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
