import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useSWR from "swr";
import { useTheme } from "@/hooks/useTheme";
import {
  ClientVisitReportRecord,
  extractClientVisitReports,
  fetchClientVisitReportDetail,
} from "@/services/clientBookingService";
import { SWR_KEYS } from "@/services/swrKeys";

function display(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    return value.map(display).filter(Boolean).join(", ");
  }
  return "";
}

function ReportCard({
  report,
  onPreviewImage,
}: {
  report: ClientVisitReportRecord;
  onPreviewImage: (url: string, name?: string) => void;
}) {
  const { colors } = useTheme();
  const rows: [string, unknown][] = [
    ["Date", report.visit_date ?? report.booking_date ?? report.date],
    ["Time", [report.start_time, report.end_time].filter(Boolean).join(" - ")],
    ["Service", report.service_name ?? report.service_title],
    ["Caregiver", report.employee_name],
    ["Status", report.status],
    ["Notes", report.tasks_note],
  ];

  return (
    <View
      style={[
        styles.reportCard,
        { backgroundColor: colors.card.background, borderColor: colors.border },
      ]}
    >
      {rows.map(([label, value]) => {
        const text = display(value);
        if (!text) return null;
        return (
          <View key={label} style={styles.reportField}>
            <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>{label}</Text>
            <Text style={[styles.fieldValue, { color: colors.textPrimary }]}>{text}</Text>
          </View>
        );
      })}
      {report.attachments?.length ? (
        <View style={styles.attachmentSection}>
          <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>Attachments</Text>
          <View style={styles.attachmentList}>
            {report.attachments.map((attachment, index) => (
              <TouchableOpacity
                key={`${attachment.url ?? attachment.name ?? "file"}-${index}`}
                disabled={!attachment.url}
                onPress={() => {
                  if (attachment.url) {
                    if (attachment.type?.startsWith("image/")) {
                      onPreviewImage(attachment.url, attachment.name);
                    } else {
                      void Linking.openURL(attachment.url).catch((openError) => {
                        console.error("Could not open visit report attachment =>", openError);
                      });
                    }
                  }
                }}
                style={styles.attachmentTile}
                accessibilityRole="button"
                accessibilityLabel={
                  attachment.type?.startsWith("image/")
                    ? `Preview ${attachment.name ?? "image"}`
                    : `Open ${attachment.name ?? "attachment"}`
                }
              >
                {attachment.type?.startsWith("image/") && attachment.url ? (
                  <View style={styles.attachmentImageWrap}>
                    <Image
                      source={{ uri: attachment.url }}
                      style={styles.attachmentThumbnail}
                      resizeMode="cover"
                      accessibilityLabel={attachment.name}
                    />
                    <View style={styles.previewIndicator}>
                      <MaterialIcons name="visibility" size={15} color="#FFFFFF" />
                    </View>
                  </View>
                ) : (
                  <View style={[styles.attachmentFileIcon, { backgroundColor: colors.backgroundAlt }]}>
                    <MaterialIcons name="description" size={30} color={colors.primary} />
                  </View>
                )}
                <Text style={[styles.attachmentName, { color: colors.link.color }]} numberOfLines={2}>
                  {attachment.name ?? attachment.url ?? "Attachment"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

export default function ClientVisitReportDetailScreen() {
  const { booking_id } = useLocalSearchParams<{ booking_id: string }>();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [previewImage, setPreviewImage] = useState<{ url: string; name?: string } | null>(null);

  const { data, error, isLoading, mutate } = useSWR(
    booking_id ? SWR_KEYS.clientVisitReportDetail(booking_id) : null,
    () => fetchClientVisitReportDetail(booking_id!),
    { revalidateOnFocus: true },
  );

  const reports = useMemo(() => extractClientVisitReports(data), [data]);

  useEffect(() => {
    if (data !== undefined) {
      console.log("Client visit report detail =>", JSON.stringify(data, null, 2));
    }
  }, [data]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { backgroundColor: colors.primary, paddingTop: insets.top + 10 },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={23} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Visit Report</Text>
        <View style={styles.backButton} />
      </View>
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <MaterialIcons name="error-outline" size={42} color={colors.error} />
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            {error.message || "Could not load visit report"}
          </Text>
          <TouchableOpacity
            onPress={() => {
              void mutate().catch((retryError) => {
                console.error("Client visit report retry error =>", retryError);
              });
            }}
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : reports.length ? (
        <ScrollView contentContainerStyle={styles.content}>
          {reports.map((report, index) => (
            <ReportCard
              key={`${report._id ?? report.booking_id ?? booking_id}-${index}`}
              report={report}
              onPreviewImage={(url, name) => setPreviewImage({ url, name })}
            />
          ))}
        </ScrollView>
      ) : (
        <View style={styles.centered}>
          <MaterialIcons name="description" size={42} color={colors.textTertiary} />
          <Text style={[styles.message, { color: colors.textSecondary }]}>No report yet</Text>
        </View>
      )}
      <Modal
        visible={previewImage !== null}
        animationType="fade"
        onRequestClose={() => setPreviewImage(null)}
        statusBarTranslucent
      >
        <View style={styles.previewContainer}>
          <View style={[styles.previewHeader, { paddingTop: insets.top + 12 }]}>
            <Text style={styles.previewTitle} numberOfLines={1}>
              {previewImage?.name}
            </Text>
            <TouchableOpacity
              onPress={() => setPreviewImage(null)}
              accessibilityRole="button"
              accessibilityLabel="Close image preview"
              style={styles.previewCloseButton}
            >
              <MaterialIcons name="close" size={26} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          {previewImage ? (
            <Image
              source={{ uri: previewImage.url }}
              style={styles.previewImage}
              resizeMode="contain"
              accessibilityLabel={previewImage.name}
            />
          ) : null}
        </View>
      </Modal>
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
  content: { padding: 14, paddingBottom: 28 },
  reportCard: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10 },
  reportField: { marginBottom: 10 },
  fieldLabel: { fontSize: 10, fontWeight: "600", marginBottom: 3 },
  fieldValue: { fontSize: 14, lineHeight: 20 },
  attachmentSection: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, marginTop: 2 },
  attachmentTile: { width: 52, alignItems: "center", gap: 4 },
  attachmentList: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  attachmentImageWrap: { position: "relative" },
  attachmentThumbnail: { width: 52, height: 52, borderRadius: 7, backgroundColor: "#E5E5E5" },
  previewIndicator: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    transform: [{ translateX: -13 }, { translateY: -13 }],
  },
  attachmentFileIcon: {
    width: 52,
    height: 52,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  attachmentName: { width: "100%", fontSize: 11, textAlign: "center" },
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
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  message: { marginTop: 10, fontSize: 14, textAlign: "center" },
  retryButton: { marginTop: 15, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 8 },
  retryText: { color: "#FFFFFF", fontWeight: "600" },
});
