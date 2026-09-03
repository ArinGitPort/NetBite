import { useCallback, useEffect, useState } from "react";

import * as workshopApi from "@/lib/api/workshop-service";
import type { WorkshopAssessmentRow, WorkshopClassRow, WorkshopLessonRow, WorkshopRow, WorkshopTopologyRow, WorkshopVersionRow } from "@/lib/api/types";
import { defaultTopology } from "@/features/workshops/topology-editor";
import type { WorkshopDetailsMode } from "@/features/workshops/workshop-details-dialog";

export type WorkshopArea = "workshops" | "classes" | "workshop-assessments" | "gradebook";

export function useWorkshopStudio(area: WorkshopArea) {
  const [loading, setLoading] = useState(true);
  const [workshops, setWorkshops] = useState<WorkshopRow[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [lessons, setLessons] = useState<WorkshopLessonRow[]>([]);
  const [topologies, setTopologies] = useState<WorkshopTopologyRow[]>([]);
  const [assessments, setAssessments] = useState<WorkshopAssessmentRow[]>([]);
  const [classes, setClasses] = useState<WorkshopClassRow[]>([]);
  const [versions, setVersions] = useState<WorkshopVersionRow[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<string>();
  const [selectedAssessment, setSelectedAssessment] = useState<string>();
  const [selectedTopology, setSelectedTopology] = useState<string>();
  const [collectionView, setCollectionView] = useState<"lessons" | "topologies">("lessons");
  const [gradeRows, setGradeRows] = useState<Array<Record<string, unknown>>>([]);
  const [gradebookLoading, setGradebookLoading] = useState(area === "gradebook");
  const [notice, setNotice] = useState<string>();
  const [error, setError] = useState<string>();
  const [detailsMode, setDetailsMode] = useState<WorkshopDetailsMode>();
  const [addingLesson, setAddingLesson] = useState(false);
  const [topologyDetailsOpen, setTopologyDetailsOpen] = useState(false);
  const [topologyName, setTopologyName] = useState("");
  const [savingTopologyName, setSavingTopologyName] = useState(false);
  const selectedWorkshop = workshops.find((item) => item.id === selectedId);

  const load = useCallback(async () => {
    try {
      setError(undefined);
      const [workshopRows, classRows] = await Promise.all([workshopApi.getWorkshops(), workshopApi.getWorkshopClasses()]);
      setWorkshops(workshopRows);
      setClasses(classRows);
      setSelectedId((current) => current && workshopRows.some((row) => row.id === current) ? current : workshopRows[0]?.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The workspace could not be loaded.");
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(undefined), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (!selectedId) return;
    void Promise.all([workshopApi.getWorkshopContent(selectedId), workshopApi.getWorkshopVersions(selectedId)])
      .then(([content, versionRows]) => {
        setLessons(content.lessons); setTopologies(content.topologies); setAssessments(content.assessments); setVersions(versionRows);
        setSelectedLesson((current) => current && content.lessons.some((row) => row.id === current) ? current : content.lessons[0]?.id);
        setSelectedAssessment((current) => current && content.assessments.some((row) => row.id === current) ? current : content.assessments[0]?.id);
        setSelectedTopology((current) => current && content.topologies.some((row) => row.stable_id === current) ? current : content.topologies[0]?.stable_id);
      }).catch((reason: Error) => setError(reason.message));
  }, [selectedId]);

  const create = async (title: string, description: string) => {
    const row = await workshopApi.createWorkshop(title, description);
    setWorkshops((value) => [row, ...value]); setSelectedId(row.id); setNotice("Lesson collection created as a private draft.");
  };
  const saveDetails = async (workshop: WorkshopRow) => {
    const saved = await workshopApi.saveWorkshop(workshop);
    setWorkshops((value) => value.map((item) => item.id === saved.id ? saved : item));
    setNotice("Lesson collection details saved.");
  };
  const deleteDraft = async (workshop: WorkshopRow) => {
    await workshopApi.deleteWorkshop(workshop.id);
    setSelectedId(undefined); setLessons([]); setTopologies([]); setAssessments([]); setVersions([]);
    await load(); setNotice("Private lesson collection deleted.");
  };
  const selectedClass = classes.find((item) => item.workshop_id === selectedId);
  useEffect(() => {
    if (area !== "gradebook") return;
    if (!selectedClass) {
      setGradeRows([]);
      setGradebookLoading(false);
      return;
    }
    let active = true;
    setGradeRows([]);
    setGradebookLoading(true);
    void workshopApi.getWorkshopGradebook(selectedClass.id)
      .then((result) => { if (active) setGradeRows(result.rows); })
      .catch((reason: Error) => { if (active) setError(reason.message); })
      .finally(() => { if (active) setGradebookLoading(false); });
    return () => { active = false; };
  }, [area, selectedClass?.id]);
  const updateLesson = (row: WorkshopLessonRow) => setLessons((value) => value.map((item) => item.id === row.id ? row : item));
  const addLesson = async () => {
    if (!selectedWorkshop || addingLesson) return;
    setAddingLesson(true); setError(undefined);
    try {
      const nextPosition = lessons.reduce((highest, lesson) => Math.max(highest, lesson.position), 0) + 1;
      const row = await workshopApi.createWorkshopLesson(selectedWorkshop.id, nextPosition);
      setLessons((value) => [...value, row]); setSelectedLesson(row.id); setNotice("Lesson added. Add its title and content, then save it.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The lesson could not be added."); }
    finally { setAddingLesson(false); }
  };
  const deleteLesson = async (lesson: WorkshopLessonRow) => {
    await workshopApi.deleteWorkshopLesson(lesson.id);
    const remaining = lessons.filter((item) => item.id !== lesson.id);
    setLessons(remaining); setSelectedLesson(remaining[0]?.id); setNotice("Lesson deleted from the current draft.");
  };
  const updateAssessment = (row: WorkshopAssessmentRow) => setAssessments((value) => value.map((item) => item.id === row.id ? row : item));
  const addTopology = () => {
    if (!selectedWorkshop) return;
    const row = defaultTopology(selectedWorkshop.id);
    setTopologies((value) => [...value, row]); setSelectedTopology(row.stable_id); setCollectionView("topologies");
  };
  const selectedTopologyRow = topologies.find((row) => row.stable_id === selectedTopology);
  const topologyReferenceCount = selectedTopologyRow ? lessons.reduce((total, lesson) => {
    const blocks = Array.isArray(lesson.draft.blocks) ? lesson.draft.blocks : [];
    return total + blocks.filter((block) => block && typeof block === "object" && "topologyId" in block && block.topologyId === selectedTopologyRow.stable_id).length;
  }, 0) : 0;
  const openTopologyDetails = () => {
    if (!selectedTopologyRow) return;
    setTopologyName(String(selectedTopologyRow.definition.title ?? "Untitled topology")); setTopologyDetailsOpen(true);
  };
  const renameTopology = async () => {
    if (!selectedTopologyRow) return;
    const title = topologyName.trim();
    if (!title) { setError("Enter a topology name before saving."); return; }
    setSavingTopologyName(true); setError(undefined);
    try {
      const saved = await workshopApi.saveWorkshopTopology({ ...selectedTopologyRow, definition: { ...selectedTopologyRow.definition, title } });
      setTopologies((value) => value.map((row) => row.stable_id === saved.stable_id ? saved : row));
      setTopologyDetailsOpen(false); setNotice("Topology name saved.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The topology name could not be saved."); }
    finally { setSavingTopologyName(false); }
  };
  const deleteTopology = async () => {
    if (!selectedTopologyRow || topologyReferenceCount > 0) return;
    try {
      if (selectedTopologyRow.id) await workshopApi.deleteWorkshopTopology(selectedTopologyRow.id);
      const remaining = topologies.filter((row) => row.stable_id !== selectedTopologyRow.stable_id);
      setTopologies(remaining); setSelectedTopology(remaining[0]?.stable_id); setTopologyDetailsOpen(false); setNotice("Topology deleted from the current draft.");
    } catch (reason) {
      const error = reason instanceof Error ? reason : new Error("The topology could not be deleted.");
      setError(error.message);
      throw error;
    }
  };

  return { loading, workshops, setWorkshops, selectedId, setSelectedId, lessons, topologies, setTopologies, assessments, setAssessments, classes, versions, selectedLesson, setSelectedLesson, selectedAssessment, setSelectedAssessment, selectedTopology, setSelectedTopology, collectionView, setCollectionView, gradeRows, gradebookLoading, notice, setNotice, error, setError, detailsMode, setDetailsMode, addingLesson, topologyDetailsOpen, setTopologyDetailsOpen, topologyName, setTopologyName, savingTopologyName, selectedWorkshop, load, create, saveDetails, deleteDraft, updateLesson, addLesson, deleteLesson, updateAssessment, addTopology, selectedTopologyRow, topologyReferenceCount, openTopologyDetails, renameTopology, deleteTopology };
}
