"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
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
import { addUser, mockUsers, updateUser } from "@/lib/mock/users"
import type { User } from "@/types/user"

function emptyUser(): User {
  return {
    id: crypto.randomUUID(),
    studentId: "",
    name: "",
    email: "",
    slackId: null,
    isActive: true,
  }
}

/**
 * User List (spec/frontend.md#System Administration > User List, UC-12).
 * Every cell is directly editable (spec/frontend.md UI Principle 4); "行を追加"
 * adds a mostly-blank row. Edits call the mock/users.ts mutators (not just
 * local state) so they're visible to other screens, e.g. the Yearly Companies
 * assigned-member picker, after navigating there.
 *
 * Role assignment (UC-12 step 2) is out of scope — see spec/usecase.md UC-12
 * Notes. Disabling is the 有効 toggle; there is no delete action.
 *
 * TODO: replace mockUsers with GET /users, and wire edits to POST/PATCH
 * /users once the backend endpoints exist (spec/api.md).
 */
export default function UsersPage() {
  const [users, setUsers] = useState<User[]>(mockUsers)

  function handleUpdate(id: string, patch: Partial<User>) {
    updateUser(id, patch)
    setUsers((prev) =>
      prev.map((user) => (user.id === id ? { ...user, ...patch } : user))
    )
  }

  function handleAdd() {
    const user = emptyUser()
    addUser(user)
    setUsers((prev) => [...prev, user])
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-muted-foreground">システム利用者の管理</p>
        </div>
        <Button onClick={handleAdd}>行を追加</Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>学籍番号</TableHead>
              <TableHead>氏名</TableHead>
              <TableHead>メールアドレス</TableHead>
              <TableHead>Slack ID</TableHead>
              <TableHead>有効</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <Input
                    value={user.studentId}
                    placeholder="学籍番号"
                    onChange={(e) =>
                      handleUpdate(user.id, { studentId: e.target.value })
                    }
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={user.name}
                    placeholder="氏名"
                    onChange={(e) =>
                      handleUpdate(user.id, { name: e.target.value })
                    }
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="email"
                    value={user.email}
                    placeholder="メールアドレス"
                    onChange={(e) =>
                      handleUpdate(user.id, { email: e.target.value })
                    }
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={user.slackId ?? ""}
                    placeholder="未連携"
                    onChange={(e) =>
                      handleUpdate(user.id, {
                        slackId: e.target.value || null,
                      })
                    }
                  />
                </TableCell>
                <TableCell>
                  <Switch
                    checked={user.isActive}
                    onCheckedChange={(checked) =>
                      handleUpdate(user.id, { isActive: checked })
                    }
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
