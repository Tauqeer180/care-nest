import { MaterialIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useSWR from "swr";
import { useTheme } from "@/hooks/useTheme";
import {
  EmployeeVisitReport,
  VisitReportAttachment,
  fetchEmployeeVisitContext,
  saveEmployeeVisitReport,
  uploadEmployeeVisitReportAttachment,
} from "@/services/employeeVisitsService";

export default function EmployeeVisitDetailScreen() {
  const { booking_id, visit_date } = useLocalSearchParams<{
    booking_id: string;
    visit_date: string;
  }>();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tasksNote, setTasksNote] = useState("");
  const [attachments, setAttachments] = useState<VisitReportAttachment[]>([]);
  const [previewAttachment, setPreviewAttachment] = useState<VisitReportAttachment | null>(null);
  const [reportEditorOpen, setReportEditorOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const draftInitialized = useRef(false);

  const { data, error, isLoading, mutate } = useSWR(
    booking_id && visit_date
      ? ["employee-visit-context", booking_id, visit_date]
      : null,
    ([, id, date]) => fetchEmployeeVisitContext(id, date),
  );

  const existingReport = data?.report ?? data?.reports?.[0] ?? null;
  const submittedAt = data?.submitted_at ?? existingReport?.submitted_at;
  const submittedAtTime = submittedAt ? Date.parse(submittedAt) : NaN;
  const editableUntilTime = data?.editable_until
    ? Date.parse(data.editable_until)
    : NaN;
  const hasReport = existingReport !== null;
  const isWithinEditWindow = (now: number) =>
    !hasReport ||
    (Number.isFinite(submittedAtTime)
      ? now < submittedAtTime + 24 * 60 * 60 * 1000
      : Number.isFinite(editableUntilTime) && now < editableUntilTime);
  const withinEditWindow = isWithinEditWindow(currentTime);
  const canEditReport =
    !!data?.can_write && !!data?.has_happened && withinEditWindow;

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!data || draftInitialized.current) return;
    draftInitialized.current = true;
    const report = data.report ?? data.reports?.[0];
    setTasksNote(report?.tasks_note ?? "");
    setAttachments(report?.attachments ?? []);
  }, [data]);

  const handlePreviewAttachment = async (attachment: VisitReportAttachment) => {
    if (!attachment.url) return;
    if (attachment.type.startsWith("image/")) {
      setPreviewAttachment(attachment);
      return;
    }

    try {
      await Linking.openURL(attachment.url);
    } catch (openError) {
      console.error("Could not open employee visit attachment =>", openError);
      Alert.alert(
        "Could not open attachment",
        openError instanceof Error ? openError.message : "Please try again.",
      );
    }
  };

  useEffect(() => {
    if (data !== undefined) {
      console.log("Employee visit context =>", JSON.stringify(data, null, 2));
    }
  }, [data]);

  const handleAttachFiles = async () => {
    try {
      const selection = await DocumentPicker.getDocumentAsync({
        type: [
          "image/*",
          "application/pdf",
          "text/plain",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ],
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (selection.canceled) return;

      setUploading(true);
      const uploaded: VisitReportAttachment[] = [];
      const failed: string[] = [];
      for (const asset of selection.assets) {
        try {
          uploaded.push(
            await uploadEmployeeVisitReportAttachment({
              uri: asset.uri,
              name: asset.name,
              mimeType: asset.mimeType,
            }),
          );
        } catch (uploadError) {
          failed.push(
            `${asset.name}: ${
              uploadError instanceof Error ? uploadError.message : "Upload failed"
            }`,
          );
        }
      }
      setAttachments((current) => [...current, ...uploaded]);
      if (failed.length) {
        Alert.alert("Some files could not be uploaded", failed.join("\n"));
      }
    } catch (pickerError) {
      Alert.alert(
        "Could not select files",
        pickerError instanceof Error ? pickerError.message : "Please try again.",
      );
    } finally {
      setUploading(false);
    }
  };

  const handleSaveReport = async () => {
    if (
      !data?.visit ||
      !data.can_write ||
      !data.has_happened ||
      !isWithinEditWindow(Date.now())
    ) {
      if (hasReport && !isWithinEditWindow(Date.now())) {
        Alert.alert(
          "Edit period expired",
          "Reports can only be edited for 24 hours after submission.",
        );
      }
      return;
    }
    if (!tasksNote.trim()) {
      Alert.alert("Report note required", "Add a note about the care provided.");
      return;
    }

    setSaving(true);
    try {
      const response = await saveEmployeeVisitReport({
        booking_id: data.visit.booking_id,
        visit_date: data.visit.visit_date,
        start_time: data.visit.start_time,
        tasks_note: tasksNote.trim(),
        attachments: [...attachments],
        status: "Completed",
      });
      console.log("Employee visit report saved =>", JSON.stringify(response, null, 2));
      setReportEditorOpen(false);
      Alert.alert("Report saved", "Your visit report was saved successfully.");
      void mutate().catch((refreshError) => {
        console.error("Employee visit context refresh after save failed =>", refreshError);
      });
    } catch (saveError) {
      Alert.alert(
        "Could not save report",
        saveError instanceof Error ? saveError.message : "Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const renderReport = (report: EmployeeVisitReport, index: number) => (
    <View
      key={`${report.created_at ?? "report"}-${index}`}
      style={[
        styles.reportCard,
        { backgroundColor: colors.card.background, borderColor: colors.border },
      ]}
    >
      <View style={styles.reportHeader}>
        <Text style={[styles.reportStatus, { color: colors.textPrimary }]}>
          {report.status || "Visit report"}
        </Text>
        {report.created_at ? (
          <Text style={[styles.mutedText, { color: colors.textTertiary }]}>
            {report.created_at}
          </Text>
        ) : null}
      </View>
      {report.tasks_note ? (
        <Text style={[styles.reportNote, { color: colors.textSecondary }]}>
          {report.tasks_note}
        </Text>
      ) : null}
      {report.attachments?.length ? (
        <View style={styles.reportAttachments}>
          {report.attachments.map((attachment, attachmentIndex) => (
            <TouchableOpacity
              key={`${attachment.key}-${attachmentIndex}`}
              style={styles.attachmentTile}
              onPress={() => void handlePreviewAttachment(attachment)}
              disabled={!attachment.url}
              accessibilityRole="button"
              accessibilityLabel={`Preview ${attachment.name}`}
            >
              {attachment.type.startsWith("image/") ? (
                <Image
                  source={{ uri: attachment.url }}
                  style={styles.attachmentThumbnail}
                  resizeMode="cover"
                  accessibilityLabel={attachment.name}
                />
              ) : (
                <View style={[styles.attachmentFileIcon, { backgroundColor: colors.backgroundAlt }]}>
                  <MaterialIcons name="description" size={30} color={colors.primary} />
                </View>
              )}
              <Text style={[styles.attachmentTileName, { color: colors.link.color }]} numberOfLines={2}>
                {attachment.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { backgroundColor: colors.primary, paddingTop: insets.top + 10 },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <MaterialIcons name="arrow-back" size={23} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Visit Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <MaterialIcons name="error-outline" size={42} color={colors.error} />
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            {error.message || "Could not load visit details"}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={() => {
              void mutate().catch((retryError) => {
                console.error("Employee visit context retry error =>", retryError);
              });
            }}
          >
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Visit</Text>
          <View
            style={[
              styles.contextCard,
              { backgroundColor: colors.card.background, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.visitService, { color: colors.textPrimary }]}>
              {data?.visit.service_name}
            </Text>
            <View style={styles.contextGrid}>
              <ContextValue label="Client" value={data?.visit.client_name ?? ""} color={colors.textSecondary} />
              <ContextValue label="Employee" value={data?.visit.employee_name ?? ""} color={colors.textSecondary} />
              <ContextValue label="Date" value={data?.visit.visit_date ?? ""} color={colors.textSecondary} />
              <ContextValue
                label="Time"
                value={`${data?.visit.start_time ?? ""} - ${data?.visit.end_time ?? ""}`}
                color={colors.textSecondary}
              />
              <ContextValue label="Status" value={data?.booking_status_label ?? ""} color={colors.textSecondary} />
              <ContextValue label="Visits" value={String(data?.booking_visit_count ?? 0)} color={colors.textSecondary} />
            </View>
          </View>

          <Text style={[styles.sectionTitle, styles.sectionSpacing, { color: colors.textPrimary }]}>
            Reports
          </Text>
          {data?.reports?.length ? (
            data.reports.map(renderReport)
          ) : (
            <View
              style={[
                styles.emptyReports,
                { backgroundColor: colors.card.background, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.mutedText, { color: colors.textSecondary }]}>No reports</Text>
            </View>
          )}

          {canEditReport ? (
            <TouchableOpacity
              style={[styles.openEditorButton, { backgroundColor: colors.primary }]}
              onPress={() => setReportEditorOpen(true)}
              accessibilityRole="button"
            >
              <MaterialIcons
                name={hasReport ? "edit" : "add"}
                size={19}
                color="#FFFFFF"
              />
              <Text style={styles.saveButtonText}>
                {hasReport ? "Edit visit report" : "Add visit report"}
              </Text>
            </TouchableOpacity>
          ) : (
            <View
              style={[
                styles.emptyReports,
                { backgroundColor: colors.card.background, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.mutedText, { color: colors.textSecondary }]}>
                {hasReport && Number.isFinite(submittedAtTime) &&
                currentTime >= submittedAtTime + 24 * 60 * 60 * 1000
                  ? "This report can no longer be edited. Reports can be edited for 24 hours after submission."
                  : data?.has_happened
                  ? "This visit report cannot be edited."
                  : "Report entry will be available after the visit."}
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      <Modal
        visible={reportEditorOpen}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!saving && !uploading) setReportEditorOpen(false);
        }}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          style={styles.editorModalRoot}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={[styles.editorSheet, { backgroundColor: colors.background }]}>
            <View style={styles.editorHandle} />
            <View style={[styles.editorHeader, { borderBottomColor: colors.divider }]}>
              <Text style={[styles.editorTitle, { color: colors.textPrimary }]}>
                {hasReport ? "Edit visit report" : "Add visit report"}
              </Text>
              <TouchableOpacity
                onPress={() => setReportEditorOpen(false)}
                disabled={saving || uploading}
                accessibilityRole="button"
                accessibilityLabel="Close report editor"
                style={styles.editorCloseButton}
              >
                <MaterialIcons name="close" size={23} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView
              contentContainerStyle={styles.editorContent}
              keyboardShouldPersistTaps="handled"
            >
              <View
                style={[
                  styles.formCard,
                  { backgroundColor: colors.card.background, borderColor: colors.border },
                ]}
              >
                <TextInput
                  value={tasksNote}
                  onChangeText={setTasksNote}
                  placeholder="Describe the care and tasks completed..."
                  placeholderTextColor={colors.input.placeholder}
                  multiline
                  textAlignVertical="top"
                  editable={!saving && !uploading}
                  style={[
                    styles.noteInput,
                    {
                      color: colors.input.text,
                      backgroundColor: colors.input.background,
                      borderColor: colors.input.border,
                    },
                  ]}
                />

                <TouchableOpacity
                  style={[styles.attachButton, { borderColor: colors.primary }]}
                  onPress={handleAttachFiles}
                  disabled={uploading || saving}
                >
                  {uploading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <MaterialIcons name="attach-file" size={19} color={colors.primary} />
                  )}
                  <Text style={[styles.attachButtonText, { color: colors.primary }]}>
                    {uploading ? "Uploading files..." : "Attach photos or documents"}
                  </Text>
                </TouchableOpacity>

                {attachments.map((attachment, index) => (
                  <View
                    key={`${attachment.key}-${index}`}
                    style={[styles.uploadedFile, { borderBottomColor: colors.divider }]}
                  >
                    <TouchableOpacity
                      style={styles.uploadedFilePreview}
                      onPress={() => void handlePreviewAttachment(attachment)}
                      accessibilityRole="button"
                      accessibilityLabel={`Preview ${attachment.name}`}
                    >
                      {attachment.type.startsWith("image/") ? (
                        <Image
                          source={{ uri: attachment.url }}
                          style={styles.attachmentThumbnail}
                          resizeMode="cover"
                          accessibilityLabel={attachment.name}
                        />
                      ) : (
                        <View style={[styles.attachmentFileIcon, { backgroundColor: colors.backgroundAlt }]}>
                          <MaterialIcons name="description" size={30} color={colors.primary} />
                        </View>
                      )}
                      <Text
                        style={[styles.attachmentName, { color: colors.link.color }]}
                        numberOfLines={1}
                      >
                        {attachment.name}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() =>
                        setAttachments((current) => current.filter((_, i) => i !== index))
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${attachment.name}`}
                    >
                      <MaterialIcons name="close" size={18} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                ))}

                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    { backgroundColor: colors.primary, opacity: saving || uploading ? 0.6 : 1 },
                  ]}
                  onPress={handleSaveReport}
                  disabled={saving || uploading}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <MaterialIcons name="save" size={18} color="#FFFFFF" />
                  )}
                  <Text style={styles.saveButtonText}>
                    {saving ? "Saving..." : "Save Report"}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={previewAttachment !== null}
        animationType="fade"
        onRequestClose={() => setPreviewAttachment(null)}
        statusBarTranslucent
      >
        <View style={styles.previewContainer}>
          <View style={[styles.previewHeader, { paddingTop: insets.top + 12 }]}>
            <Text style={styles.previewTitle} numberOfLines={1}>
              {previewAttachment?.name}
            </Text>
            <TouchableOpacity
              onPress={() => setPreviewAttachment(null)}
              accessibilityRole="button"
              accessibilityLabel="Close image preview"
              style={styles.previewCloseButton}
            >
              <MaterialIcons name="close" size={26} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          {previewAttachment ? (
            <Image
              source={{ uri: previewAttachment.url }}
              style={styles.previewImage}
              resizeMode="contain"
              accessibilityLabel={previewAttachment.name}
            />
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

function ContextValue({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={styles.contextValue}>
      <Text style={styles.contextLabel}>{label}</Text>
      <Text style={[styles.contextText, { color }]} numberOfLines={2}>{value || "—"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  backButton: { width: 36, height: 36, justifyContent: "center" },
  headerTitle: { color: "#FFFFFF", fontSize: 19, fontWeight: "700" },
  headerSpacer: { width: 36 },
  content: { padding: 16, paddingBottom: 32 },
  sectionTitle: { fontSize: 17, fontWeight: "700", marginBottom: 10 },
  sectionSpacing: { marginTop: 20 },
  openEditorButton: {
    minHeight: 46,
    borderRadius: 9,
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 7,
  },
  contextCard: { borderWidth: 1, borderRadius: 12, padding: 14 },
  visitService: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  contextGrid: { flexDirection: "row", flexWrap: "wrap", rowGap: 13 },
  contextValue: { width: "50%", paddingRight: 8 },
  contextLabel: { color: "#8B8B8B", fontSize: 10, fontWeight: "600", marginBottom: 3 },
  contextText: { fontSize: 13, lineHeight: 18 },
  emptyReports: { borderWidth: 1, borderRadius: 12, padding: 14 },
  reportCard: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 9 },
  reportHeader: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  reportStatus: { fontSize: 14, fontWeight: "700" },
  reportNote: { fontSize: 13, lineHeight: 19, marginTop: 8 },
  reportAttachments: { marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  attachmentTile: { width: 72, alignItems: "center", gap: 4 },
  attachmentThumbnail: { width: 52, height: 52, borderRadius: 7, backgroundColor: "#E5E5E5" },
  attachmentFileIcon: {
    width: 52,
    height: 52,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  attachmentName: { flex: 1, fontSize: 12 },
  attachmentTileName: { width: "100%", fontSize: 11, textAlign: "center" },
  uploadedFilePreview: {
    flex: 1,
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  mutedText: { fontSize: 13 },
  formCard: { borderWidth: 1, borderRadius: 12, padding: 12 },
  noteInput: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 10,
    fontSize: 14,
  },
  attachButton: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 9,
    marginVertical: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  attachButtonText: { fontSize: 13, fontWeight: "600" },
  uploadedFile: {
    minHeight: 42,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  saveButton: {
    minHeight: 46,
    borderRadius: 9,
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 7,
  },
  saveButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  message: { fontSize: 14, marginTop: 12, textAlign: "center" },
  retryButton: { marginTop: 16, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 8 },
  retryText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  editorModalRoot: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  editorSheet: {
    maxHeight: "90%",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingBottom: 12,
  },
  editorHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    backgroundColor: "#999999",
    marginTop: 10,
  },
  editorHeader: {
    minHeight: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  editorTitle: { fontSize: 17, fontWeight: "700" },
  editorCloseButton: { width: 40, height: 40, alignItems: "flex-end", justifyContent: "center" },
  editorContent: { padding: 16, paddingBottom: 28 },
  previewContainer: { flex: 1, backgroundColor: "#000000" },
  previewHeader: {
    minHeight: 60,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  previewTitle: { flex: 1, color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
  previewCloseButton: { width: 40, height: 40, alignItems: "flex-end", justifyContent: "center" },
  previewImage: { flex: 1, width: "100%", marginBottom: 20 },
});
