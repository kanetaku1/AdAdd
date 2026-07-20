"use client"

import { useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ApiError, isApiEnabled } from "@/lib/api/client"
import { createUser, listUsers, updateUser } from "@/lib/data/users"
import { ROLES, type Role, type User } from "@/types/user"

type UserForm = {
  studentId: string
  name: string
  email: string
  slackId: string
  roles: Role[]
}

function emptyForm(): UserForm {
  return { studentId: "", name: "", email: "", slackId: "", roles: [] }
}

function formFromUser(user: User): UserForm {
  return {
    studentId: user.studentId,
    name: user.name,
    email: user.email,
    slackId: user.slackId ?? "",
    roles: user.roles,
  }
}

/**
 * User List (spec/frontend.md#Settings > User List, UC-12).
 * Student ID / Name / Email / Slack ID / Role(s) change rarely once a user
 * is set up, so they're edited through a dialog — the same pattern as
 * Company List's "Edit company" action — rather than always-editable cells.
 * This is an explicit exception to Principle 4 (see spec/frontend.md).
 * Active stays an inline toggle: disabling/re-enabling is a frequent,
 * deliberate access-control action, not a profile edit.
 *
 * Role assignment has no backend support yet (spec/model.md#Role has no CRUD
 * API) — lib/data/users.ts always returns `roles: []` in API mode, so the
 * role picker is hidden there rather than silently discarding a selection
 * the user made (Issue #17 convention).
 */
export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<UserForm>(emptyForm())
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setLoadError(null)
      try {
        const list = await listUsers()
        if (!cancelled) setUsers(list)
      } catch (e) {
        if (!cancelled) {
          setLoadError(
            e instanceof Error ? e.message : "読み込みに失敗しました"
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const isOpen = editingId !== null
  const isNew = editingId === "new"

  function openNew() {
    setForm(emptyForm())
    setFormError(null)
    setEditingId("new")
  }

  function openEdit(user: User) {
    setForm(formFromUser(user))
    setFormError(null)
    setEditingId(user.id)
  }

  function toggleFormRole(role: Role) {
    setForm((prev) => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter((r) => r !== role)
        : [...prev.roles, role],
    }))
  }

  async function handleSave() {
    if (!form.studentId || !form.name || !form.email) return

    const fields = {
      studentId: form.studentId,
      name: form.name,
      email: form.email,
      slackId: form.slackId || null,
      roles: form.roles,
    }

    setSubmitting(true)
    setFormError(null)
    try {
      if (isNew) {
        const created = await createUser(fields)
        setUsers((prev) => [...prev, created])
      } else if (editingId) {
        const updated = await updateUser(editingId, fields)
        setUsers((prev) =>
          prev.map((user) => (user.id === editingId ? updated : user))
        )
      }
      setEditingId(null)
    } catch (e) {
      setFormError(
        e instanceof ApiError && e.status === 409
          ? "このメールアドレスは既に使われています"
          : e instanceof Error
            ? e.message
            : "保存に失敗しました"
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleActive(user: User, checked: boolean) {
    try {
      const updated = await updateUser(user.id, { isActive: checked })
      setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)))
    } catch (e) {
      setLoadError(
        e instanceof Error ? e.message : "有効/無効の切り替えに失敗しました"
      )
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">Users</h2>
          <p className="text-muted-foreground">システム利用者の管理</p>
        </div>
        <Button onClick={openNew}>ユーザーを追加</Button>
      </div>

      {loadError && (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {loadError}
        </p>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>学籍番号</TableHead>
              <TableHead>氏名</TableHead>
              <TableHead>メールアドレス</TableHead>
              <TableHead>Slack ID</TableHead>
              <TableHead>ロール</TableHead>
              <TableHead>有効</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground">
                  読み込み中…
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground"
                >
                  ユーザーがまだいません
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.studentId}</TableCell>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.slackId ?? "未連携"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.roles.length === 0 ? (
                        <span className="text-muted-foreground">-</span>
                      ) : (
                        user.roles.map((role) => (
                          <Badge key={role} variant="outline">
                            {role}
                          </Badge>
                        ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={user.isActive}
                      onCheckedChange={(checked) =>
                        void toggleActive(user, checked)
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(user)}
                    >
                      編集
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={isOpen}
        onOpenChange={(next) => {
          if (!next) setEditingId(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isNew ? "ユーザーを追加" : "ユーザーを編集"}
            </DialogTitle>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="userStudentId">学籍番号</FieldLabel>
              <Input
                id="userStudentId"
                value={form.studentId}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, studentId: e.target.value }))
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="userName">氏名</FieldLabel>
              <Input
                id="userName"
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="userEmail">メールアドレス</FieldLabel>
              <Input
                id="userEmail"
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, email: e.target.value }))
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="userSlackId">Slack ID</FieldLabel>
              <Input
                id="userSlackId"
                placeholder="未連携"
                value={form.slackId}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, slackId: e.target.value }))
                }
              />
            </Field>
            {isApiEnabled() ? (
              <Field>
                <FieldLabel>ロール</FieldLabel>
                <p className="text-sm text-muted-foreground">
                  ロール管理は未実装です(バックエンドの対応待ち)。
                </p>
              </Field>
            ) : (
              <Field>
                <FieldLabel>ロール</FieldLabel>
                <div className="flex flex-wrap gap-1">
                  {ROLES.map((role) => (
                    <Badge
                      key={role}
                      variant={form.roles.includes(role) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleFormRole(role)}
                    >
                      {role}
                    </Badge>
                  ))}
                </div>
              </Field>
            )}
          </FieldGroup>
          {formError && (
            <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {formError}
            </p>
          )}
          <DialogFooter>
            <Button
              onClick={() => void handleSave()}
              disabled={
                !form.studentId || !form.name || !form.email || submitting
              }
            >
              {submitting ? "保存中…" : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
