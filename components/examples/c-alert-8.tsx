import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/reui/alert"
import { CircleAlertIcon } from "lucide-react"

export function Pattern() {
  return (
    <Alert variant="destructive">
      <CircleAlertIcon
      />
      <AlertTitle>Error! Something went wrong</AlertTitle>
      <AlertDescription>
        Please try again. If the problem persists, contact support.
      </AlertDescription>
    </Alert>
  )
}