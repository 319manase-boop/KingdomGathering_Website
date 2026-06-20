// user-modal.js - handles Add/Edit User modal

let addUserModalInstance = null;
let currentMode = "create";
let editingUserId = null;
let refreshUsersCallback = null;

async function loadRolesIntoDropdown() {
    const select = document.getElementById("newRole");

    if (!select) return;

    const { data, error } = await supabaseClient
        .from("roles")
        .select("id, name")
        .order("name", { ascending: true });

    if (error) {
        console.error("Failed to load roles:", error);
        showAlert("danger", "Unable to load roles.");
        return;
    }

    select.innerHTML = `<option value="">Select role</option>`;

    (data || []).forEach(role => {
        const option = document.createElement("option");
        option.value = role.id;
        option.textContent = role.name;
        select.appendChild(option);
    });
}

window.initUserModal = function (onCreated) {
    loadRolesIntoDropdown();
    refreshUsersCallback = onCreated;

    const modalEl = document.getElementById("addUserModal");

    if (!modalEl || !window.bootstrap) {
        console.error("Add User modal or Bootstrap not found.");
        return;
    }

    addUserModalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);

    document.getElementById("openAddUser")?.addEventListener("click", openCreateModal);
    document.getElementById("emptyAddUser")?.addEventListener("click", openCreateModal);

    document.getElementById("createUserBtn")?.addEventListener("click", handleSaveUser);
};

function openCreateModal() {
    currentMode = "create";
    editingUserId = null;

    document.getElementById("addUserForm").reset();
    document.getElementById("createUserBtn").textContent = "Create User";

    addUserModalInstance.show();
}

async function handleSaveUser(e) {
    const btn = e.target;

    const full_name = document.getElementById("newFullName").value.trim();
    const email = document.getElementById("newEmail").value.trim();
    const phone = document.getElementById("newPhone").value.trim();
    const role_id = document.getElementById("newRole").value;
    const status = document.getElementById("newStatus").value;

    if (!full_name || !email || !role_id) {
        showAlert("danger", "Name, email, and role are required.");
        return;
    }

    const payload = { full_name, email, phone, role_id, status };
    console.log(payload);

    btn.disabled = true;
    btn.textContent = currentMode === "edit" ? "Saving..." : "Creating...";

    try {
        let response;

        if (currentMode === "edit") {
            response = await supabaseClient
                .from("users")
                .update({ full_name, phone, role_id, status })
                .eq("id", editingUserId);
        } else {
            response = await supabaseClient
                .from("users")
                .insert([payload]);
        }

        if (response.error) throw response.error;

        showAlert(
            "success",
            currentMode === "edit" ? "User updated." : "User created."
        );

        addUserModalInstance.hide();
        document.getElementById("addUserForm").reset();

        if (typeof refreshUsersCallback === "function") {
            await refreshUsersCallback();
        }
    } catch (err) {
        console.error(err);
        showAlert("danger", "Unable to save user.");
    } finally {
        btn.disabled = false;
        btn.textContent = "Create User";
        currentMode = "create";
        editingUserId = null;
    }
}

window.openEditModal = function (user) {
    currentMode = "edit";
    editingUserId = user.id;

    document.getElementById("newFullName").value = user.full_name || "";
    document.getElementById("newEmail").value = user.email || "";
    document.getElementById("newPhone").value = user.phone || "";
    document.getElementById("newRole").value = user.role || "";
    document.getElementById("newStatus").value = user.status || "active";

    document.getElementById("createUserBtn").textContent = "Save Changes";

    addUserModalInstance.show();
};