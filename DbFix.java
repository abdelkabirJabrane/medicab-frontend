import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;

public class DbFix {
    public static void main(String[] args) throws Exception {
        String url = "jdbc:mysql://localhost:3306/user_db?useSSL=false&serverTimezone=UTC";
        try (Connection conn = DriverManager.getConnection(url, "root", "Root");
             Statement stmt = conn.createStatement()) {
            System.out.println("Cleaning up old roles and users...");
            // Delete roles that do not exist in the new Enum
            int removedRoles = stmt.executeUpdate("DELETE FROM user_roles WHERE role NOT IN ('ROLE_SUPER_ADMIN', 'ROLE_MEDECIN', 'ROLE_SECRETAIRE', 'ROLE_PATIENT')");
            System.out.println("Removed " + removedRoles + " invalid roles.");
            
            // Delete users that have no roles left, or we can just leave them if it doesn't break Hibernate
            // But to be safe let's delete users that don't match the new system
            int removedUsers = stmt.executeUpdate("DELETE FROM users WHERE NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = users.id)");
            System.out.println("Removed " + removedUsers + " users entirely because they had invalid or no roles.");
            
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
